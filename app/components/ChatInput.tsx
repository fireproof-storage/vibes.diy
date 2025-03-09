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
          placeholder="Fireproof your app idea..."
          disabled={isGenerating}
          rows={2}
        />
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={isGenerating}
          className={`absolute right-0 bottom-0 -mr-1 flex items-center justify-center rounded-lg border py-2 px-1 shadow-sm w-[110px] transition-all duration-300 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 active:shadow-inner overflow-hidden ${
            isGenerating 
              ? 'border-gray-300 dark:border-gray-500 bg-white dark:bg-black' 
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-black'
          }`}
        >
          {isGenerating && <div className="glimmer-overlay" />}
          <div className="relative z-10">
            <img 
              src="/fp-logo.svg" 
              alt="Fireproof" 
              className="block dark:hidden h-5 transition-all hover:brightness-110 active:brightness-125" 
            />
            <img 
              src="/fp-logo-white.svg" 
              alt="Fireproof" 
              className="hidden dark:block h-5 transition-all hover:brightness-110 active:brightness-125" 
            />
          </div>
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
