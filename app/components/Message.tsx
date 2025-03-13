import { memo } from 'react';
import StructuredMessage from './StructuredMessage';
import type { ChatMessageDocument, AiChatMessageDocument, Segment } from '../types/chat';

// Need to define the actual ChatMessage and AiChatMessage types since they're missing from types/chat.ts
export type ChatMessage = ChatMessageDocument & {
  text: string;
  timestamp?: number;
};

export type AiChatMessage = ChatMessage & {
  type: 'ai';
  segments?: Segment[];
  isStreaming?: boolean;
};

interface MessageProps {
  message: ChatMessage;
  index: number;
  isShrinking: boolean;
  isExpanding: boolean;
}

// Individual message component to optimize rendering
const Message = memo(
  ({
    message,
    index,
    isShrinking,
    isExpanding,
  }: MessageProps) => {
    const isAI = message.type === 'ai';
    const isUser = message.type === 'user';

    // Extract the specific properties for AI messages
    const aiMessage = message as AiChatMessage;

    return (
      <div
        data-testid={`message-${index}`}
        className={`flex flex-row ${isAI ? 'justify-start' : 'justify-end'} mb-4 px-4`}
      >
        <div
          className={`max-w-[85%] rounded-lg px-4 py-2 ${
            isAI
              ? 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              : 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white'
          } ${isShrinking ? 'animate-width-shrink' : isExpanding ? 'animate-width-expand' : ''}`}
        >
          {isAI ? (
            <StructuredMessage
              segments={aiMessage.segments || []}
              isStreaming={aiMessage.isStreaming}
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p>{message.text}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default Message; 