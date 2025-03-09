import { useEffect, useRef, memo, useMemo, useState } from 'react';
import { useFireproof } from 'use-fireproof';

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

interface SessionSidebarProps {
  isVisible: boolean;
  onToggle: () => void;
  onSelectSession: (session: SessionDocument) => void;
}

/**
 * Component that displays a collapsible sidebar with chat session history
 */
function SessionSidebar({ isVisible, onToggle, onSelectSession }: SessionSidebarProps) {
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
        if (!groups.has(sessionId)) {
          // Initialize with empty ScreenshotDocument array
          groups.set(sessionId, { session: undefined, screenshots: [] });
        }
        groups.get(sessionId)!.screenshots.push(doc as ScreenshotDocument);
      } else {
        // Handle session
        if (!groups.has(doc._id)) {
          groups.set(doc._id, { session: undefined, screenshots: [] });
        }
        groups.get(doc._id)!.session = doc as SessionDocument;
      }
    });

    // Convert map to array and sort by session timestamp
    return Array.from(groups.values())
      .filter((group) => group.session) // Only include groups with sessions
      .sort((a, b) => (b.session!.timestamp || 0) - (a.session!.timestamp || 0));
  }, [sessionAndScreenshots]) as { session: SessionDocument; screenshots: ScreenshotDocument[] }[];

  // Handle clicks outside the sidebar to close it
  useEffect(() => {
    // Only add listener if sidebar is visible
    if (!isVisible) return;

    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onToggle();
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onToggle]);

  // Select a session and notify parent component
  const handleSelectSession = (session: SessionDocument) => {
    if (onSelectSession) {
      onSelectSession(session);
      // Close sidebar after selection regardless of screen size
      onToggle();
    }
  };

  // Memoize the sidebar classes to prevent recalculations on every render
  const sidebarClasses = useMemo(() => {
    return `bg-light-background-00 dark:bg-dark-background-00 fixed top-0 left-0 z-10 h-full shadow-lg transition-all duration-300 ${
      isVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
    }`;
  }, [isVisible]);

  // Conditionally render content but keep animation classes
  return (
    <div ref={sidebarRef} className={sidebarClasses}>
      {/* Only render content when sidebar is visible to save resources */}
      {isVisible && (
        <div className="h-full overflow-y-auto">
          <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex items-center justify-between border-b p-4">
            <h2 className="text-light-primary dark:text-dark-primary text-lg font-semibold">
              App History
            </h2>
            <button
              type="button"
              onClick={onToggle}
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

          <div className="p-2">
            {groupedSessions.length === 0 ? (
              <p className="text-light-secondary dark:text-dark-secondary p-2 text-sm">
                No saved sessions yet
              </p>
            ) : (
              <ul className="space-y-2">
                {groupedSessions.map(({ session, screenshots }) => (
                  <li
                    key={session._id}
                    onClick={() => handleSelectSession(session as SessionDocument)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && handleSelectSession(session as SessionDocument)
                    }
                    className="hover:bg-light-decorative-00 dark:hover:bg-dark-decorative-00 w-full cursor-pointer rounded p-3 text-left transition-colors"
                    role="button"
                    tabIndex={0}
                    aria-label={`Select session: ${(session as SessionDocument).title || 'Untitled Chat'}`}
                  >
                    <div className="text-light-primary dark:text-dark-primary truncate text-sm font-medium">
                      {(session as SessionDocument).title || 'Untitled SessionDocument'}
                    </div>
                    <div className="text-light-secondary dark:text-dark-secondary text-xs">
                      {new Date((session as SessionDocument).timestamp).toLocaleDateString()} -
                      {new Date((session as SessionDocument).timestamp).toLocaleTimeString()}
                    </div>
                    {screenshots.map(
                      (screenshot) =>
                        screenshot._files?.screenshot && (
                          <ImgFile
                            key={screenshot._id}
                            file={screenshot._files?.screenshot}
                            alt={`Screenshot from ${session.title}`}
                            className="max-h-60 max-w-full object-contain"
                          />
                        )
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(SessionSidebar, (prevProps, nextProps) => {
  // Only re-render if isVisible changes
  // Note: Functions should be memoized by parent components
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.onToggle === nextProps.onToggle &&
    prevProps.onSelectSession === nextProps.onSelectSession
  );
});
