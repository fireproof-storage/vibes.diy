import { useEffect, useRef, memo, useMemo } from 'react';
import Message, { WelcomeScreen } from './Message';
import type { ChatMessageDocument } from '../types/chat';

interface MessageListProps {
  messages: ChatMessageDocument[];
  isStreaming: boolean;
  isShrinking?: boolean;
  isExpanding?: boolean;
}

function MessageList({
  messages,
  isStreaming,
  isShrinking = false,
  isExpanding = false,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messageElements = useMemo(() => {
    return messages.map((msg, i) => {
      return (
        <Message
          key={msg._id || 'streaming' + i}
          message={msg}
          isShrinking={isShrinking}
          isExpanding={isExpanding}
        />
      );
    });
  }, [messages, isShrinking, isExpanding]);

  useEffect(() => {
    try {
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error scrolling:', error);
    }
  }, [messages, isStreaming]);

  return (
    <div
      className={`flex-1 overflow-y-auto ${
        isShrinking ? 'animate-width-shrink' : isExpanding ? 'animate-width-expand' : ''
      }`}
      ref={messagesEndRef}
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col py-4">
        {messages.length === 0 && !isStreaming ? (
          <WelcomeScreen />
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
export default memo(MessageList, (prevProps, nextProps) => {
  // Reference equality check for animation flags
  const animationStateEqual =
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isShrinking === nextProps.isShrinking &&
    prevProps.isExpanding === nextProps.isExpanding;

  // Content equality check for messages
  const messagesEqual =
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages.every((msg, i) => msg._id === nextProps.messages[i]._id);

  return animationStateEqual && messagesEqual;
});
