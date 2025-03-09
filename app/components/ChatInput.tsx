import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, memo } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

function ChatInput({ value, onChange, onSend, onKeyDown, disabled, inputRef }: ChatInputProps) {
  // Initial auto-resize
  useEffect(() => {
    // Auto-resize logic
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  }, [value, inputRef]);

  return (
    <div className="input-area border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 border-t px-4 py-3">
      <div className="relative flex items-start">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-00 dark:bg-dark-background-00 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full flex-1 resize-y rounded-xl border p-2.5 pr-12 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="Describe the app you want to create..."
          disabled={disabled}
          rows={2}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className={`absolute right-2 bottom-2 flex items-center justify-center rounded-full p-2 text-sm font-medium transition-colors duration-200 ${
            disabled
              ? 'bg-light-decorative-01 dark:bg-dark-decorative-01 text-light-primary dark:text-dark-primary cursor-not-allowed opacity-50'
              : 'bg-accent-01-light dark:bg-accent-01-dark hover:bg-accent-02-light dark:hover:bg-accent-02-dark cursor-pointer text-white'
          }`}
          aria-label={disabled ? 'Generating' : 'Send message'}
        >
          {disabled ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Generating message</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Send message</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5l0 14M12 5l-4 4M12 5l4 4"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
