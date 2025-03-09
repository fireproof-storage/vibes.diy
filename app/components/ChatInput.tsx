import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  isGenerating: boolean;
  onSend: () => void;
  autoResizeTextarea: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  setIsGenerating: (isGenerating: boolean) => void;
}

function ChatInput({
  input,
  setInput,
  isGenerating,
  onSend,
  autoResizeTextarea,
  inputRef,
  setIsGenerating,
}: ChatInputProps) {
  const [isGeneratingState, setIsGeneratingState] = useState(isGenerating);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoResizeTextarea();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGeneratingState) {
      e.preventDefault();
      onSend();
    }
  };

  const handleSend = () => {
    setIsGeneratingState(true);
    setIsGenerating(true);
    onSend();
    setIsGeneratingState(false);
    setIsGenerating(false);
  };

  return (
    <div className="input-area border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 border-t px-4 py-3">
      <div className="relative flex items-start">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-00 dark:bg-dark-background-00 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full flex-1 resize-y rounded-xl border p-2.5 pr-12 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="Describe the app you want to create..."
          disabled={isGeneratingState}
          rows={2}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isGeneratingState}
          className={`absolute right-2 bottom-2 flex items-center justify-center rounded-full p-2 text-sm font-medium transition-colors duration-200 ${
            isGeneratingState
              ? 'bg-light-decorative-01 dark:bg-dark-decorative-01 text-light-primary dark:text-dark-primary cursor-not-allowed opacity-50'
              : 'bg-accent-01-light dark:bg-accent-01-dark hover:bg-accent-02-light dark:hover:bg-accent-02-dark cursor-pointer text-white'
          }`}
          aria-label={isGeneratingState ? 'Generating' : 'Send message'}
        >
          {isGeneratingState ? (
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

export default ChatInput;
