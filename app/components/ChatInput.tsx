import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, memo, useCallback } from 'react';
import VibesDIYLogo from './VibesDIYLogo';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  docsLength: number;
  isStreaming: boolean;
}

function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  disabled,
  inputRef,
  docsLength,
  isStreaming,
}: ChatInputProps) {
  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 200;
      const minHeight = 90;
      textarea.style.height = `${Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight))}px`;
    }
  }, [inputRef]);

  // Initial auto-resize
  useEffect(() => {
    autoResizeTextarea();
  }, [value, autoResizeTextarea]);

  return (
    <div className="px-4 py-2">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-01 dark:bg-dark-background-01 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full resize-y rounded-lg border p-2.5 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder={docsLength || isStreaming ? 'Continue coding...' : 'I want to build...'}
          rows={2}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className={`light-gradient border-glimmer hover:border-light-decorative-01 dark:hover:border-dark-decorative-01 absolute flex items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md active:shadow-inner ${
            disabled
              ? 'border-light-decorative-01 dark:border-dark-decorative-01'
              : 'border-light-decorative-01 dark:border-dark-decorative-00'
          } right-0 bottom-0 -mr-2 -mb-1 w-[110px] px-1 py-2`}
          style={{
            backdropFilter: 'blur(1px)',
          }}
          aria-label={disabled ? 'Generating' : 'Send message'}
        >
          <div className="relative z-10">
            <VibesDIYLogo className="h-[28px] pl-1.5" />
          </div>
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
