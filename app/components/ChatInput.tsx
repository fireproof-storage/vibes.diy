import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, memo, useCallback } from 'react';
import type { ChatState } from '../types/chat';
import VibesDIYLogo from './VibesDIYLogo';

interface ChatInputProps {
  chatState: ChatState;
  onSend: () => void;
}

function ChatInput({ chatState, onSend }: ChatInputProps) {
  // Internal callback to handle sending messages
  const handleSendMessage = useCallback(() => {
    if (chatState.sendMessage && !chatState.isStreaming) {
      chatState.sendMessage(chatState.input);
      onSend(); // Call onSend for side effects only
    }
  }, [chatState, onSend]);
  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = chatState.inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 200;
      const minHeight = 90;
      textarea.style.height = `${Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight))}px`;
    }
  }, [chatState.inputRef]);

  // Initial auto-resize
  useEffect(() => {
    autoResizeTextarea();
  }, [chatState.input, autoResizeTextarea]);

  return (
    <div className="px-4 py-2">
      <div className="space-y-2">
        <textarea
          ref={chatState.inputRef}
          value={chatState.input}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
            if (chatState.setInput) {
              chatState.setInput(e.target.value);
            }
          }}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey && !chatState.isStreaming) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-01 dark:bg-dark-background-01 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full resize-y rounded-lg border p-2.5 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder={
            chatState.docs.length || chatState.isStreaming
              ? 'Continue coding...'
              : 'I want to build...'
          }
          rows={2}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={chatState.isStreaming}
            className={`bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center rounded-lg px-4 py-2 text-white font-medium transition-colors duration-200 ${
              chatState.isStreaming ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
            aria-label={chatState.isStreaming ? 'Generating' : 'Send message'}
          >
            {chatState.isStreaming ? (
              <span className="text-sm">•••</span>
            ) : (
              <span className="text-sm">Send</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
