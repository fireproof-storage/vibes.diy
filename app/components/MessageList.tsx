import { useEffect, useRef, memo, useCallback, useMemo } from 'react';
import type { ChatMessage } from '../types/chat';
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  currentStreamedText: string;
  isShrinking?: boolean;
  isExpanding?: boolean;
}

// Shared utility function for rendering markdown content
// Extracted outside the component to prevent recreation on each render
const renderMarkdownContent = (text: string) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
};

// Individual message component to optimize rendering
const Message = memo(
  ({
    message,
    index,
    isShrinking,
    isExpanding,
  }: {
    message: ChatMessage;
    index: number;
    isShrinking: boolean;
    isExpanding: boolean;
  }) => {
    return (
      <div
        className={`flex flex-col transition-all duration-500 ${
          isShrinking ? 'origin-top-left scale-0 opacity-0' : 'scale-100 opacity-100'
        } ${isExpanding ? 'animate-bounce-in' : ''}`}
        style={{
          transitionDelay: isShrinking ? `${index * 50}ms` : '0ms',
        }}
      >
        <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.type === 'ai' && (
            <div className="bg-dark-decorative-00 dark:bg-light-decorative-00 mr-2 flex h-8 w-8 items-center justify-center rounded-full">
              <span className="text-light-primary dark:text-dark-primary text-sm font-medium">
                AI
              </span>
            </div>
          )}
          <div
            className={`message rounded-2xl p-3 ${
              message.type === 'user'
                ? 'bg-accent-02-light dark:bg-accent-02-dark rounded-tr-sm text-white'
                : 'bg-light-decorative-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary rounded-tl-sm'
            } max-w-[85%] shadow-sm`}
          >
            {renderMarkdownContent(message.text)}
          </div>
        </div>
      </div>
    );
  }
);

// Optimized AI Typing component
const AITyping = memo(({ currentStreamedText }: { currentStreamedText: string }) => {
  return (
    <div className="flex justify-start">
      <div className="bg-dark-decorative-00 dark:bg-light-decorative-00 mr-2 flex h-8 w-8 items-center justify-center rounded-full">
        <span className="text-light-primary dark:text-dark-primary text-sm font-medium">AI</span>
      </div>
      <div className="message bg-light-decorative-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary max-w-[85%] rounded-2xl rounded-tl-sm p-3 shadow-sm">
        {currentStreamedText ? (
          <>
            {renderMarkdownContent(currentStreamedText)}
            <span className="bg-light-primary dark:bg-dark-primary ml-1 inline-block h-4 w-2 animate-pulse" />
          </>
        ) : (
          <div className="flex items-center gap-2">
            Thinking
            <span className="flex gap-1">
              <span className="bg-light-primary dark:bg-dark-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
              <span className="bg-light-primary dark:bg-dark-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
              <span className="bg-light-primary dark:bg-dark-primary h-1.5 w-1.5 animate-bounce rounded-full" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

function MessageList({
  messages,
  isGenerating,
  currentStreamedText,
  isShrinking = false,
  isExpanding = false,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    try {
      // Only run scrollIntoView if the element exists and the function is available
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error scrolling into view:', error);
    }
  }, [messages, currentStreamedText]);

  // Memoize the message list to prevent unnecessary re-renders
  const messageElements = useMemo(() => {
    return messages.map((msg, i) => (
      <Message
        key={`${msg.type}-${i}`}
        message={msg}
        index={i}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    ));
  }, [messages, isShrinking, isExpanding]);

  return (
    <div
      className="messages bg-light-background-00 dark:bg-dark-background-00 flex-1 space-y-4 overflow-y-auto p-4"
      style={{ maxHeight: 'calc(100vh - 140px)' }}
    >
      {messageElements}
      {isGenerating && <AITyping currentStreamedText={currentStreamedText} />}
      <div ref={messagesEndRef} />
    </div>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(MessageList, (prevProps, nextProps) => {
  // Simplified equality check focusing on the essential changed values
  const messagesEqual =
    prevProps.messages === nextProps.messages ||
    (prevProps.messages.length === nextProps.messages.length &&
      JSON.stringify(prevProps.messages) === JSON.stringify(nextProps.messages));

  return (
    messagesEqual &&
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.currentStreamedText === nextProps.currentStreamedText &&
    prevProps.isShrinking === nextProps.isShrinking &&
    prevProps.isExpanding === nextProps.isExpanding
  );
});
