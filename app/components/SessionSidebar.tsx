import { useEffect, useRef, memo } from 'react';
import { useSessionList } from '../hooks/sidebar/useSessionList';
import { ImgFile } from './SessionSidebar/ImgFile';
import { encodeTitle } from './SessionSidebar/utils';
import type { SessionSidebarProps } from '../types/chat';

/**
 * Component that displays a collapsible sidebar with chat session history
 */
function SessionSidebar({ isVisible, onClose }: SessionSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Use the custom hook instead of direct database queries
  const { groupedSessions } = useSessionList();

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

  // Render session items with Link components
  const renderSessionItems = () => {
    return groupedSessions.map(({ session, screenshots }) => {
      // Skip if this isn't a session document
      if (!session || !('_id' in session)) {
        return null;
      }

      const title = session.title || 'New Chat';
      const encodedTitle = encodeTitle(title);

      // first and last screenshots, if they exist, and unique
      const shownScreenshots = [screenshots[0], screenshots[screenshots.length - 1]]
        .filter((screenshot) => screenshot !== undefined)
        .filter(
          (screenshot, index, self) => self.findIndex((t) => t._id === screenshot._id) === index
        );

      return (
        <li
          key={session._id}
          className="cursor-pointer border-b border-gray-200 p-3 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <a
            href={`/chat/${session._id}/${encodedTitle}`}
            className="block"
            onClick={() => onClose()}
          >
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(session.created_at).toLocaleString()}
            </div>
            {shownScreenshots.map(
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
          </a>
        </li>
      );
    });
  };

  // Conditionally render content but keep animation classes
  return (
    <div
      ref={sidebarRef}
      className={`bg-light-background-00 dark:bg-dark-background-00 fixed top-0 left-0 z-10 h-full shadow-lg transition-all duration-300 ${
        isVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
      }`}
    >
      <div className="flex h-full flex-col overflow-scroll">
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
  return prevProps.isVisible === nextProps.isVisible && prevProps.onClose === nextProps.onClose;
});
