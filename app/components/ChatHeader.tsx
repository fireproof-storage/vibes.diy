import { memo } from 'react';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  isGenerating: boolean;
  restartCount: number; // P340b
  onRestart: () => void; // P340b
}

function ChatHeader({ onToggleSidebar, onNewChat, isGenerating, restartCount, onRestart }: ChatHeaderProps) {
  return (
    <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 flex min-h-[4rem] items-center justify-between border-b px-6 py-4">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark mr-3"
          aria-label="Toggle chat history"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        </button>
        <div className="flex items-center">
          <img src="/fp-logo.svg" alt="Fireproof App Builder" className="block h-8 dark:hidden" />
          <img
            src="/fp-logo-white.svg"
            alt="Fireproof App Builder"
            className="hidden h-8 dark:block"
          />
        </div>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={onNewChat}
          className="peer bg-accent-02-light dark:bg-accent-02-dark hover:bg-accent-03-light dark:hover:bg-accent-03-dark flex cursor-pointer items-center justify-center rounded-full p-2.5 text-white transition-colors"
          disabled={isGenerating}
          aria-label="New Chat"
          title="New Chat"
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
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <span className="pointer-events-none absolute top-full right-0 mt-1 rounded bg-gray-800 px-2 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity peer-hover:opacity-100">
          New Chat
        </span>
      </div>
      <div className="relative ml-4">
        <button
          type="button"
          onClick={onRestart}
          className="peer bg-accent-02-light dark:bg-accent-02-dark hover:bg-accent-03-light dark:hover:bg-accent-03-dark flex cursor-pointer items-center justify-center rounded-full p-2.5 text-white transition-colors"
          aria-label="Restart"
          title="Restart"
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
              d="M12 4v1m0 14v1m8-8h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707"
            />
          </svg>
        </button>
        <span className="pointer-events-none absolute top-full right-0 mt-1 rounded bg-gray-800 px-2 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity peer-hover:opacity-100">
          Restart
        </span>
      </div>
    </div>
  );
}

// Use React.memo with a custom comparison function to ensure the component only
// re-renders when its props actually change
export default memo(ChatHeader, (prevProps, nextProps) => {
  // Only re-render if isGenerating changes
  // Note: Functions should be memoized by parent components
  return (
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.onNewChat === nextProps.onNewChat &&
    prevProps.onToggleSidebar === nextProps.onToggleSidebar &&
    prevProps.restartCount === nextProps.restartCount && // P809b
    prevProps.onRestart === nextProps.onRestart // P809b
  );
});
