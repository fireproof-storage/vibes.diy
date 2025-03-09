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
    <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 border-t px-4 py-3">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-00 dark:bg-dark-background-00 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full resize-y rounded-xl border p-2.5 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="Vibe coding? Just Fireproof it."
          disabled={disabled}
          rows={2}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className={`light-gradient dark:dark-gradient absolute right-0 bottom-0 -mr-2 -mb-1 flex w-[110px] items-center justify-center overflow-hidden rounded-lg border px-1 py-2 shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md active:shadow-inner dark:hover:border-gray-600 ${
            disabled
              ? 'border-gray-300 dark:border-gray-500'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          style={{
            backdropFilter: 'blur(1px)',
          }}
          aria-label={disabled ? 'Generating' : 'Send message'}
        >
          {disabled && <div className="glimmer-overlay" />}
          <div className="relative z-10">
            <img
              src="/fp-logo.svg"
              alt="Fireproof"
              className="block h-5 transition-all hover:brightness-110 active:brightness-125 dark:hidden"
            />
            <img
              src="/fp-logo-white.svg"
              alt="Fireproof"
              className="hidden h-5 transition-all hover:brightness-110 active:brightness-125 dark:block"
            />
          </div>
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
