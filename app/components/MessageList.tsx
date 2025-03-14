import { memo, useMemo } from 'react';
import Message, { WelcomeScreen } from './Message';
import type { ChatMessageDocument } from '../types/chat';

interface MessageListProps {
  messages: ChatMessageDocument[];
  isStreaming: boolean;
  isShrinking?: boolean;
  isExpanding?: boolean;
  setSelectedResponseId?: (id: string) => void;
}

function MessageList({
  messages,
  isStreaming,
  isShrinking = false,
  isExpanding = false,
  setSelectedResponseId,
}: MessageListProps) {
  const messageElements = useMemo(() => {
    return messages.map((msg, i) => {
      return (
        <Message
          key={msg._id || 'streaming' + i}
          message={msg}
          isStreaming={isStreaming}
          isShrinking={isShrinking}
          isExpanding={isExpanding}
          setSelectedResponseId={setSelectedResponseId}
        />
      );
    });
  }, [messages, isShrinking, isExpanding, isStreaming, setSelectedResponseId]);

  return (
    <div
      className={`flex-1 ${
        isShrinking ? 'animate-width-shrink' : isExpanding ? 'animate-width-expand' : ''
      }`}
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col py-4">
        {messages.length === 0 && !isStreaming ? (
          <WelcomeScreen />
        ) : (
          <div className="flex flex-col space-y-4">{messageElements}</div>
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

  // Check if setSelectedResponseId changed
  const setSelectedResponseIdEqual =
    prevProps.setSelectedResponseId === nextProps.setSelectedResponseId;

  // Content equality check for messages - must compare text content
  const messagesEqual =
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages.every((msg, i) => {
      const nextMsg = nextProps.messages[i];
      // Check message ID and text content
      return msg._id === nextMsg._id && msg.text === nextMsg.text;
    });

  return animationStateEqual && messagesEqual && setSelectedResponseIdEqual;
});
