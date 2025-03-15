import { memo, useMemo } from 'react';
import Message from './Message';
import type { ChatMessageDocument } from '../types/chat';

interface MessageListProps {
  messages: ChatMessageDocument[];
  isStreaming: boolean;
  setSelectedResponseId: (id: string) => void;
  selectedResponseId: string;
  setMobilePreviewShown: (shown: boolean) => void;
}

function MessageList({
  messages,
  isStreaming,
  setSelectedResponseId,
  selectedResponseId,
  setMobilePreviewShown,
}: MessageListProps) {
  const messageElements = useMemo(() => {
    return messages.map((msg, i) => {
      return (
        <Message
          key={msg._id || 'streaming' + i}
          message={msg}
          isStreaming={isStreaming}
          setSelectedResponseId={setSelectedResponseId}
          selectedResponseId={selectedResponseId}
          setMobilePreviewShown={setMobilePreviewShown}
        />
      );
    });
  }, [messages, isStreaming, setSelectedResponseId, selectedResponseId, setMobilePreviewShown]);

  return (
    <div className="flex-1">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col py-4">
        <div className="flex flex-col space-y-4">{messageElements}</div>
      </div>
    </div>
  );
}
export default memo(MessageList, (prevProps, nextProps) => {
  // Reference equality check for isStreaming flag
  const streamingStateEqual = prevProps.isStreaming === nextProps.isStreaming;

  // Check if setSelectedResponseId changed
  const setSelectedResponseIdEqual =
    prevProps.setSelectedResponseId === nextProps.setSelectedResponseId;

  // Check if selectedResponseId changed
  const selectedResponseIdEqual = prevProps.selectedResponseId === nextProps.selectedResponseId;

  // Check if setMobilePreviewShown changed
  const setMobilePreviewShownEqual =
    prevProps.setMobilePreviewShown === nextProps.setMobilePreviewShown;

  // Content equality check for messages - must compare text content
  const messagesEqual =
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages.every((msg, i) => {
      const nextMsg = nextProps.messages[i];
      // Check message ID and text content
      return msg._id === nextMsg._id && msg.text === nextMsg.text;
    });

  return (
    streamingStateEqual &&
    messagesEqual &&
    setSelectedResponseIdEqual &&
    selectedResponseIdEqual &&
    setMobilePreviewShownEqual
  );
});
