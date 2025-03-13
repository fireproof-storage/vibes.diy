import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import StructuredMessage from './StructuredMessage';
import type {
  ChatMessageDocument,
  AiChatMessageDocument,
  Segment,
  ChatMessage,
  AiChatMessage,
} from '../types/chat';


interface MessageProps {
  message: ChatMessageDocument;
  index: number;
  isShrinking: boolean;
  isExpanding: boolean;
}

// Individual message component to optimize rendering
const Message = memo(({ message, isShrinking, isExpanding }: MessageProps) => {
  const isAI = message.type === 'ai';
  const isUser = message.type === 'user';

  // Extract the specific properties for AI messages
  const aiMessage = message as AiChatMessageDocument;

  return (
    <div className={`flex flex-row ${isAI ? 'justify-start' : 'justify-end'} mb-4 px-4`}>
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
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
});

export default Message;

// Welcome screen component shown when no messages are present
export const WelcomeScreen = memo(() => {
  return (
    <div className="text-accent-02 mx-auto max-w-2xl space-y-4 px-12 pt-8 text-center italic">
      <h2 className="mb-4 text-xl font-semibold">Welcome to Fireproof App Builder</h2>
      <p>Ask me to generate a web application for you</p>
      <p>
        Quickly create React apps in your browser, no setup required. Apps are sharable, or eject
        them to GitHub for easy deploys.{' '}
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
  );
});
