import { memo } from 'react';
import { MenuIcon, EditIcon } from './ChatHeaderIcons';

interface ChatHeaderContentProps {
  onOpenSidebar: () => void;
  title: string;
  isStreaming: boolean;
  codeReady: boolean;
}

function ChatHeaderContent({
  onOpenSidebar,
  title,
  isStreaming,
  codeReady,
}: ChatHeaderContentProps) {
  return (
    <div className="flex h-full w-full items-center justify-between p-2 py-4">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark mr-3 px-2 py-4"
          aria-label="Open chat history"
        >
          <MenuIcon />
        </button>
      </div>
      <div className="text-light-primary dark:text-dark-primary text-center text-sm">{title}</div>

      {(codeReady || isStreaming || title) && (
        <div className="relative px-2">
          <a
            href="/"
            className="peer bg-accent-02-light dark:bg-accent-02-dark hover:bg-accent-03-light dark:hover:bg-accent-03-dark flex cursor-pointer items-center justify-center rounded-full p-2.5 text-white transition-colors"
            aria-label="New Vibe"
            title="New Vibe"
          >
            <span className="sr-only">New Vibe</span>
            <EditIcon />
          </a>
          <span className="bg-dark-background-01 pointer-events-none absolute top-full right-0 z-100 mt-1 rounded-sm px-2 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity peer-hover:opacity-100">
            New Vibe
          </span>
        </div>
      )}
    </div>
  );
}

// Use React.memo with a custom comparison function to ensure the component only
// re-renders when its props actually change
export default memo(ChatHeaderContent, (prevProps, nextProps) => {
  // Only re-render if title or onOpenSidebar changes
  return (
    prevProps.onOpenSidebar === nextProps.onOpenSidebar &&
    prevProps.title === nextProps.title &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.codeReady === nextProps.codeReady
  );
});
