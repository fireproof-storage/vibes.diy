import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import StructuredMessage from './StructuredMessage';
import type { ChatMessageDocument, AiChatMessageDocument, AiChatMessage } from '../types/chat';
import { parseContent } from '~/utils/segmentParser';

interface MessageProps {
  message: ChatMessageDocument;
  isShrinking: boolean;
  isExpanding: boolean;
  isStreaming: boolean;
}

// Helper function to get animation classes
const getAnimationClasses = (isShrinking: boolean, isExpanding: boolean): string => {
  return isShrinking ? 'animate-width-shrink' : isExpanding ? 'animate-width-expand' : '';
};

// AI Message component (simplified without animation handling)
const AIMessage = memo(
  ({ message, isStreaming }: { message: AiChatMessageDocument; isStreaming: boolean }) => {
    const { segments } = parseContent(message.text);

    return (
      <div className="mb-4 flex flex-row justify-start px-4">
        <div className="max-w-[85%] rounded-lg bg-white px-4 py-2 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
          <StructuredMessage segments={segments || []} isStreaming={isStreaming} />
        </div>
      </div>
    );
  }
);

// User Message component (simplified without animation handling)
const UserMessage = memo(({ message }: { message: ChatMessageDocument }) => {
  return (
    <div className="mb-4 flex flex-row justify-end px-4">
      <div className="max-w-[85%] rounded-lg bg-blue-500 px-4 py-2 text-white dark:bg-blue-600 dark:text-white">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
});

// Main Message component that handles animation and decides which subcomponent to render
const Message = memo(({ message, isShrinking, isExpanding, isStreaming }: MessageProps) => {
  return (
    <div className={getAnimationClasses(isShrinking, isExpanding)}>
      {message.type === 'ai' ? (
        <AIMessage message={message as AiChatMessageDocument} isStreaming={isStreaming} />
      ) : (
        <UserMessage message={message} />
      )}
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
