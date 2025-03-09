import type { ChangeEvent, KeyboardEvent } from 'react';
import { useRef, memo, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';

// Only keep the inputRef prop which has specific functionality that can't be handled by context
interface ChatInputProps {
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function ChatInput({ inputRef: externalInputRef }: ChatInputProps = {}) {
  // Use context directly - we can assume it's available
  const { input, setInput, isGenerating, handleSendMessage } = useChatContext();

  // Use our own ref if external ref not provided
  const localInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Use provided input ref or local ref
  const inputRef = externalInputRef || localInputRef;

  // Function to auto-resize textarea
  const autoResizeTextarea = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Initial auto-resize
  useEffect(() => {
    autoResizeTextarea();
  }, []);

  // Handler for input changes
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoResizeTextarea();
  };

  // Handler for key presses
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 px-4 py-3">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[90px] max-h-[200px] resize-y rounded-xl border border-light-decorative-00 dark:border-dark-decorative-00 p-2.5 pr-32 text-sm text-light-primary dark:text-dark-primary bg-light-background-00 dark:bg-dark-background-00 focus:outline-none focus:ring-2 focus:ring-accent-01-light dark:focus:ring-accent-01-dark focus:border-transparent"
          placeholder="Describe the app you want to create..."
          disabled={isGenerating}
          rows={2}
        />
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={isGenerating}
          className="absolute right-2 bottom-2 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black py-2 px-4 shadow-sm w-[115px]"
        >
          {isGenerating ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ) : (
            <>
              <img 
                src="/fp-logo.svg" 
                alt="Fireproof" 
                className="block dark:hidden h-6" 
              />
              <img 
                src="/fp-logo-white.svg" 
                alt="Fireproof" 
                className="hidden dark:block h-6" 
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
