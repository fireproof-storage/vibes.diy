import { useEffect, useRef, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSessionMessages } from '../hooks/useSessionMessages';
import { logUIState, debugLog } from '../utils/debugLogging';
import Message from './Message';
import type { ChatMessage, AiChatMessage } from './Message';

// Direct stdout logging for tests
function writeToStdout(message: string) {
  console.debug(`🔍 MESSAGE_LIST: ${message}`);
}

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
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

// Individual message component moved to separate file: Message.tsx

function MessageList({
  messages,
  isStreaming,
  isShrinking = false,
  isExpanding = false,
}: MessageListProps) {
  // Create a local ref for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change or when streaming starts/continues
  useEffect(() => {
    try {
      // Only run scrollIntoView if the element exists and the function is available
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error scrolling into view:', error);
    }
  }, [messages, isStreaming]); // Added isStreaming as a dependency to scroll during streaming

  // Only show typing indicator when streaming and there are no messages
  const showTypingIndicator = useMemo(() => {
    const shouldShowTypingIndicator = isStreaming && messages.length === 0;

    // Log the final decision for the typing indicator
    writeToStdout(
      `🔍 DECISION: messages.length=${messages.length}, isStreaming=${isStreaming}, showTypingIndicator=${shouldShowTypingIndicator}`
    );

    return shouldShowTypingIndicator;
  }, [isStreaming, messages]);

  // Memoize the message list to prevent unnecessary re-renders
  const messageElements = useMemo(() => {
    writeToStdout(
      `Preparing to render ${messages.length} messages, showTypingIndicator=${showTypingIndicator}`
    );
    if (messages.length === 0) {
      writeToStdout(`No messages to render, showing welcome screen`);
      return [];
    }

    return messages.map((msg, i) => {
      // Create a key that changes when content changes
      let contentKey = msg.text?.length || 0;

      // For AI messages, use segments information
      if (msg.type === 'ai') {
        const aiMsg = msg as AiChatMessage;
        contentKey =
          aiMsg.segments?.reduce((total: number, segment: any) => {
            return total + (segment?.content?.length || 0);
          }, 0) || 0;

        writeToStdout(
          `Will render message ${i}: type=${msg.type}, isStreaming=${aiMsg.isStreaming}, hasSegments=${aiMsg.segments && aiMsg.segments.length > 0}, textLength=${msg.text.length}`
        );
      } else {
        writeToStdout(`Will render message ${i}: type=${msg.type}, textLength=${msg.text.length}`);
      }

      return (
        <Message
          key={`${msg.type}-${i}-${msg.timestamp || i}-${contentKey}`}
          message={msg}
          index={i}
          isShrinking={isShrinking}
          isExpanding={isExpanding}
        />
      );
    });
  }, [messages, isShrinking, isExpanding, showTypingIndicator]);

  return (
    <div
      className={`flex-1 overflow-y-auto ${
        isShrinking ? 'animate-width-shrink' : isExpanding ? 'animate-width-expand' : ''
      }`}
      ref={messagesEndRef}
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col py-4">
        {messages.length === 0 && !isStreaming ? (
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
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isShrinking === nextProps.isShrinking &&
    prevProps.isExpanding === nextProps.isExpanding
  );
});
