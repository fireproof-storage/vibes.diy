import { useEffect, useRef, memo, useMemo, useState } from 'react';
import { useFireproof } from 'use-fireproof';
import { Link } from 'react-router';

function ImgFile({
  file,
  alt,
  className,
}: {
  file: { file: () => Promise<File>; type: string };
  alt: string;
  className: string;
}) {
  const [imgDataUrl, setImgDataUrl] = useState('');
  useEffect(() => {
    if (file.type && /image/.test(file.type)) {
      file.file().then((file: File) => {
        const src = URL.createObjectURL(file);
        setImgDataUrl(src);
        return () => URL.revokeObjectURL(src);
      });
    }
  }, [file]);
  return imgDataUrl ? (
    <img className={`${className} max-h-60 max-w-full object-contain`} alt={alt} src={imgDataUrl} />
  ) : null;
}

// Add these type definitions at the top of the file
interface DocBase {
  _id: string;
}

interface ScreenshotDocument extends DocBase {
  type: 'screenshot';
  session_id: string;
  _files?: {
    screenshot: { file: () => Promise<File>; type: string };
  };
}

// Modify SessionDocument to include optional type
interface SessionDocument extends DocBase {
  type?: 'session'; // Make it optional since existing docs might not have it
  title?: string;
  timestamp: number;
  messages?: Array<{
    text: string;
    type: 'user' | 'ai';
    code?: string;
    dependencies?: Record<string, string>;
  }>;
}

// Union type for documents returned by query
type SessionOrScreenshot = SessionDocument | ScreenshotDocument;

// Helper function to encode titles for URLs
function encodeTitle(title: string): string {
  return encodeURIComponent(title || 'untitled-session')
    .toLowerCase()
    .replace(/%20/g, '-');
}

interface SessionSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectSession: (session: SessionDocument) => void;
}

/**
 * Component that displays a collapsible sidebar with chat session history
 */
function SessionSidebar({ isVisible, onClose, onSelectSession }: SessionSidebarProps) {
  const { database, useLiveQuery } = useFireproof('fireproof-chat-history');
  const sidebarRef = useRef<HTMLDivElement>(null);

  // // Query chat sessions ordered by timestamp (newest first)
  // const { docs: sessions } = useLiveQuery('type', {
  //   key: 'session',
  //   descending: true,
  // });

  // // Query chat sessions ordered by timestamp (newest first)
  // const { docs: screenshots } = useLiveQuery('type', {
  //   key: 'screenshot',
  //   descending: true,
  // });

  const { docs: sessionAndScreenshots } = useLiveQuery<SessionOrScreenshot>((doc) =>
    doc.type && doc.type === 'screenshot' ? doc.session_id : doc._id
  );

  // Group sessions and screenshots together
  const groupedSessions = useMemo(() => {
    const groups = new Map<
      string,
      { session?: SessionDocument; screenshots: ScreenshotDocument[] }
    >();

    sessionAndScreenshots.forEach((doc) => {
      if ('type' in doc && doc.type === 'screenshot') {
        // Handle screenshot
        const sessionId = doc.session_id;
        let group = groups.get(sessionId);
        if (!group) {
          group = { session: undefined, screenshots: [] };
          groups.set(sessionId, group);
        }
        group.screenshots.push(doc as ScreenshotDocument);
      } else {
        // Handle session
        let group = groups.get(doc._id);
        if (!group) {
          group = { session: undefined, screenshots: [] };
          groups.set(doc._id, group);
        }
        group.session = doc as SessionDocument;
      }
    });

    // Convert map to array and sort by session timestamp
    return Array.from(groups.values())
      .filter((group) => group.session) // Only include groups with sessions
      .sort((a, b) => (b.session!.timestamp || 0) - (a.session!.timestamp || 0));
  }, [sessionAndScreenshots]) as { session: SessionDocument; screenshots: ScreenshotDocument[] }[];

  // Handle clicks outside the sidebar to close it
  useEffect(() => {
    if (!isVisible) return;

    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Select a session and notify parent component
  const handleSelectSession = (session: SessionDocument) => {
    // Call the provided onSelectSession handler
    onSelectSession(session);
    // Close the sidebar on mobile
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Memoize the sidebar classes to prevent recalculations on every render
  const sidebarClasses = useMemo(() => {
    return `bg-light-background-00 dark:bg-dark-background-00 fixed top-0 left-0 z-10 h-full shadow-lg transition-all duration-300 ${
      isVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
    }`;
  }, [isVisible]);

  // Render session items with Link components
  const renderSessionItems = () => {
    return groupedSessions
      .map(({ session, screenshots }) => {
        // Skip if this isn't a session document
        if (!session || !('_id' in session)) {
          return null;
        }

        // Cast to SessionDocument to access title
        const sessionDoc = session as SessionDocument;
        const title = sessionDoc.title || 'New Chat';
        const encodedTitle = encodeTitle(title);

        return (
          <li
            key={sessionDoc._id}
            className="cursor-pointer border-b border-gray-200 p-3 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            data-testid="session-item"
          >
            <Link
              to={`/session/${sessionDoc._id}/${encodedTitle}`}
              className="block"
              onClick={(e) => {
                // Don't navigate, just use the handler
                e.preventDefault();
                handleSelectSession(sessionDoc);
              }}
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {new Date(sessionDoc.timestamp).toLocaleString()}
              </div>
              {screenshots.map(
                (screenshot) =>
                  screenshot._files?.screenshot && (
                    <ImgFile
                      key={screenshot._id}
                      file={screenshot._files.screenshot}
                      alt={`Screenshot from ${title}`}
                      className="mt-2"
                    />
                  )
              )}
            </Link>
          </li>
        );
      })
      .filter(Boolean);
  };

  // Conditionally render content but keep animation classes
  return (
    <div
      ref={sidebarRef}
      className={`transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-full opacity-0'
      } absolute inset-y-0 left-0 z-10 flex w-80 flex-col border-r border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800`}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-light-primary dark:text-dark-primary text-lg font-semibold">
            App History
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark"
            aria-label="Close sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-2">
          {groupedSessions.length === 0 ? (
            <p className="text-light-secondary dark:text-dark-secondary p-2 text-sm">
              No saved sessions yet
            </p>
          ) : (
            <ul className="space-y-2">{renderSessionItems()}</ul>
          )}
        </div>
      </div>
    </div>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(SessionSidebar, (prevProps, nextProps) => {
  // Only re-render if isVisible changes
  // Note: Functions should be memoized by parent components
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onSelectSession === nextProps.onSelectSession
  );
});
