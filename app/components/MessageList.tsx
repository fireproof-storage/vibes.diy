import { useEffect, useRef, memo, useCallback, useMemo } from 'react';
import type { ChatMessage, AiChatMessage } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import StructuredMessage from './StructuredMessage';
import { useSessionMessages } from '../hooks/useSessionMessages';

interface MessageListProps {
  sessionId: string | null;
  isStreaming: () => boolean;
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
            <div className="bg-light-background-00 dark:bg-dark-background-00 mr-2 flex h-8 w-8 items-center justify-center rounded-full">
              <span className="text-light-primary dark:text-dark-primary text-sm font-medium">
                AI
              </span>
            </div>
          )}
          <div
            className={`message rounded-2xl p-3 ${
              message.type === 'user'
                ? 'bg-accent-02-light dark:bg-accent-02-dark rounded-tr-sm text-white'
                : 'bg-light-background-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary rounded-tl-sm'
            } max-w-[85%] shadow-sm`}
          >
            {message.type === 'user' ? (
              renderMarkdownContent(message.text)
            ) : (
              <StructuredMessage
                segments={(message as AiChatMessage).segments}
                isStreaming={(message as AiChatMessage).isStreaming}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

// Optimized AI Typing component
const AITyping = memo(() => {
  return (
    <div className="flex justify-start">
      <div className="bg-light-background-00 dark:bg-dark-background-00 mr-2 flex h-8 w-8 items-center justify-center rounded-full">
        <span className="text-light-primary dark:text-dark-primary text-sm font-medium">AI</span>
      </div>
      <div className="message bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary max-w-[85%] rounded-2xl rounded-tl-sm p-3 shadow-sm">
        <div className="flex items-center gap-2">
          Thinking
          <span className="flex gap-1">
            <span className="bg-light-primary dark:bg-dark-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-light-primary dark:bg-dark-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-light-primary dark:bg-dark-primary h-1.5 w-1.5 animate-bounce rounded-full" />
          </span>
        </div>
      </div>
    </div>
  );
});

function MessageList({
  sessionId,
  isStreaming,
  isShrinking = false,
  isExpanding = false,
}: MessageListProps) {
  // Use the hook to get messages directly instead of through props
  const { messages, isLoading } = useSessionMessages(sessionId);
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
  }, [messages]);

  // Check if there's a streaming message
  const hasStreamingMessage = useMemo(() => {
    return messages.some((msg) => msg.type === 'ai' && (msg as AiChatMessage).isStreaming);
  }, [messages]);

  // Only show typing indicator when no streaming message with content is visible yet
  const showTypingIndicator = useMemo(() => {
    if (!isStreaming()) return false;

    // Log the current state of messages for debugging
    console.debug(
      `🔍 MESSAGE LIST DEBUG: Total messages=${messages.length}, isStreaming=${isStreaming()}`
    );

    // IMPORTANT: Check if any AI message has segments with actual content
    const hasAnyContent = messages.some(
      (msg) =>
        msg.type === 'ai' &&
        ((msg as AiChatMessage).text.length > 0 ||
          (msg as AiChatMessage).segments?.some(
            (segment) => segment.content && segment.content.trim().length > 0
          ))
    );

    // We only want to show the typing indicator if there's no content at all
    const shouldShowTypingIndicator = !hasAnyContent;

    console.debug(
      `🔍 DECISION: hasAnyContent=${hasAnyContent}, showTypingIndicator=${shouldShowTypingIndicator}`
    );

    return shouldShowTypingIndicator;
  }, [isStreaming, messages]);

  // Memoize the message list to prevent unnecessary re-renders
  const messageElements = useMemo(() => {
    return messages.map((msg, i) => (
      <Message
        key={`${msg.type}-${i}-${msg.timestamp || i}`}
        message={msg}
        index={i}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    ));
  }, [messages, isShrinking, isExpanding]);

  // Show loading state while messages are being fetched
  if (isLoading && sessionId) {
    return (
      <div className="messages bg-light-background-01 dark:bg-dark-background-01 flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex gap-1">
            <span className="bg-light-primary dark:bg-dark-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-light-primary dark:bg-dark-primary h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-light-primary dark:bg-dark-primary h-2 w-2 animate-bounce rounded-full" />
          </div>
          <span className="text-sm text-gray-500">Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 overflow-y-auto ${
        isShrinking ? 'animate-width-shrink' : isExpanding ? 'animate-width-expand' : ''
      }`}
      ref={messagesEndRef}
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col py-4">
        {messages.length === 0 && !isStreaming() ? (
          <div className="text-accent-02 mx-auto max-w-2xl space-y-4 px-12 pt-8 text-center italic">
            <h2 className="mb-4 text-xl font-semibold">Welcome to Fireproof App Builder</h2>
            <p>Ask me to generate a web application for you</p>
            <p>
              Quickly create React apps in your browser, no setup required. Apps are sharable, or
              eject them to GitHub for easy deploys.{' '}
              <a
                href="https://github.com/fireproof-storage/ai-app-builder"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-00 hover:underline"
              >
                Fork and customize this app builder
              </a>
              , no backend required.
            </p>

            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="py-2 text-lg font-semibold">About Fireproof</h3>
              <p className="text-sm">
                Fireproof enables secure saving and sharing of your data, providing encrypted live
                synchronization and offline-first capabilities. Learn more about{' '}
                <a
                  href="https://use-fireproof.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-00 hover:underline"
                >
                  Fireproof
                </a>
                .
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {messageElements}
            <div ref={messagesEndRef} />
            {showTypingIndicator && <AITyping />}
          </div>
        )}
      </div>
    </div>
  );
}

// Only re-render when necessary to improve performance
export default memo(MessageList, (prevProps, nextProps) => {
  // Don't re-render if these props haven't changed
  return (
    prevProps.sessionId === nextProps.sessionId &&
    prevProps.isStreaming() === nextProps.isStreaming() &&
    prevProps.isShrinking === nextProps.isShrinking &&
    prevProps.isExpanding === nextProps.isExpanding
  );
});
