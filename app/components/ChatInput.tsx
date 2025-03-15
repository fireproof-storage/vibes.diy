import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, memo, useCallback } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  isMobile?: boolean; // Optional prop to optimize for mobile
}

function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  disabled,
  inputRef,
  isMobile = false, // Default to desktop layout
}: ChatInputProps) {
  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Much smaller max height on mobile to prevent excessive growth
      const maxHeight = isMobile ? 60 : 200;
      const minHeight = isMobile ? 40 : 90;
      textarea.style.height = `${Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight))}px`;
    }
  }, [inputRef, isMobile]);

  // Initial auto-resize
  useEffect(() => {
    autoResizeTextarea();
  }, [value, autoResizeTextarea]);

  return (
    <div
      className={`border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-01 dark:bg-dark-background-01 border-t ${isMobile ? 'px-3 py-3' : 'px-4 py-3'}`}
    >
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className={`border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-00 dark:bg-dark-background-00 focus:ring-accent-01-light dark:focus:ring-accent-01-dark w-full resize-y rounded-xl border focus:border-transparent focus:ring-2 focus:outline-none ${
            isMobile
              ? 'max-h-[60px] min-h-[40px] p-2 text-sm'
              : 'max-h-[200px] min-h-[90px] p-2.5 text-sm'
          }`}
          placeholder={isMobile ? 'Ask me anything...' : 'Vibe coding? Use Fireproof.'}
          disabled={disabled}
          rows={isMobile ? 1 : 2}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className={`light-gradient absolute flex items-center justify-center overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md active:shadow-inner dark:hover:border-gray-600 ${
            disabled
              ? 'border-gray-300 dark:border-gray-500'
              : 'border-gray-200 dark:border-gray-700'
          } ${isMobile ? 'w-[80px] px-1 py-1.5 -right-1 bottom-0' : 'w-[110px] px-1 py-2 right-1 bottom-1'}`}
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
              className={`block transition-all hover:brightness-110 active:brightness-125 dark:hidden ${
                isMobile ? 'h-3.5' : 'h-5'
              }`}
            />
            <img
              src="/fp-logo-white.svg"
              alt="Fireproof"
              className={`hidden transition-all hover:brightness-110 active:brightness-125 dark:block ${
                isMobile ? 'h-3.5' : 'h-5'
              }`}
            />
          </div>
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
