import { memo } from 'react';

interface ChatHeaderProps {
  onOpenSidebar: () => void;
  title: string;
}

function ChatHeader({ onOpenSidebar, title }: ChatHeaderProps) {
  return (
    <div className="bg-light-background-00 dark:bg-dark-background-00 flex h-[4rem] items-center justify-between border-b px-6 py-4">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark mr-3"
          aria-label="Open chat history"
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
      </div>
      <div className="text-light-primary dark:text-dark-primary text-sm">{title}</div>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            document.location = '/';
          }}
          className="peer bg-accent-02-light dark:bg-accent-02-dark hover:bg-accent-03-light dark:hover:bg-accent-03-dark flex cursor-pointer items-center justify-center rounded-full p-2.5 text-white transition-colors"
          aria-label="New Chat"
          title="New Chat"
        >
          <span className="sr-only">New Chat</span>
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
    </div>
  );
}

// Use React.memo with a custom comparison function to ensure the component only
// re-renders when its props actually change
export default memo(ChatHeader, (prevProps, nextProps) => {
  // Only re-render if title or openSidebar or title changes
  return prevProps.onOpenSidebar === nextProps.onOpenSidebar && prevProps.title === nextProps.title;
});
