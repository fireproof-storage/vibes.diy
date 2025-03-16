import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import StructuredMessage from './StructuredMessage';
import type { ChatMessageDocument, AiChatMessageDocument } from '../types/chat';
import { parseContent } from '~/utils/segmentParser';

interface MessageProps {
  message: ChatMessageDocument;
  isStreaming: boolean;
  setSelectedResponseId: (id: string) => void;
  selectedResponseId: string;
  setMobilePreviewShown: (shown: boolean) => void;
}

// AI Message component (simplified without animation handling)
const AIMessage = memo(
  ({
    message,
    isStreaming,
    setSelectedResponseId,
    selectedResponseId,
    setMobilePreviewShown,
  }: {
    message: AiChatMessageDocument;
    isStreaming: boolean;
    setSelectedResponseId: (id: string) => void;
    selectedResponseId: string;
    setMobilePreviewShown: (shown: boolean) => void;
  }) => {
    const { segments } = parseContent(message.text);
    return (
      <div className="mb-4 flex flex-row justify-start px-4">
        <div className="mr-2 flex-shrink-0">
          <div className="bg-accent-02-light dark:bg-accent-02-dark flex h-8 w-8 items-center justify-center rounded-full shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
              />
            </svg>
          </div>
        </div>
        <div className="max-w-[85%] rounded-2xl bg-white px-5 py-3 text-gray-900 shadow-md dark:bg-gray-800 dark:text-gray-100">
          <StructuredMessage
            segments={segments || []}
            isStreaming={isStreaming}
            messageId={message._id}
            setSelectedResponseId={setSelectedResponseId}
            selectedResponseId={selectedResponseId}
            setMobilePreviewShown={setMobilePreviewShown}
          />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // If either the message text or streaming state changed, we need to re-render
    // Return false to signal React to re-render the component
    if (
      prevProps.message.text !== nextProps.message.text ||
      prevProps.isStreaming !== nextProps.isStreaming ||
      prevProps.setSelectedResponseId !== nextProps.setSelectedResponseId ||
      prevProps.selectedResponseId !== nextProps.selectedResponseId ||
      prevProps.setMobilePreviewShown !== nextProps.setMobilePreviewShown
    ) {
      return false;
    }
    // Otherwise, skip re-render
    return true;
  }
);

// User Message component (simplified without animation handling)
const UserMessage = memo(({ message }: { message: ChatMessageDocument }) => {
  return (
    <div className="mb-4 flex flex-row justify-end px-4">
      <div className="max-w-[85%] rounded-2xl bg-gray-300 px-5 py-3 text-gray-800 shadow-md dark:bg-gray-700 dark:text-gray-100">
        <div className="prose prose-sm dark:prose-invert prose-ul:pl-5 prose-ul:list-disc prose-ol:pl-5 prose-ol:list-decimal prose-li:my-0 max-w-none">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
});

// Main Message component that handles animation and decides which subcomponent to render
const Message = memo(
  ({
    message,
    isStreaming,
    setSelectedResponseId,
    selectedResponseId,
    setMobilePreviewShown,
  }: MessageProps) => {
    return (
      <div className="transition-all duration-150 ease-in hover:opacity-95">
        {message.type === 'ai' ? (
          <AIMessage
            message={message as AiChatMessageDocument}
            isStreaming={isStreaming}
            setSelectedResponseId={setSelectedResponseId}
            selectedResponseId={selectedResponseId}
            setMobilePreviewShown={setMobilePreviewShown}
          />
        ) : (
          <UserMessage message={message} />
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Check for message content changes
    if (prevProps.message.text !== nextProps.message.text) {
      return false; // Text changed, need to re-render
    }

    // Check for streaming state changes
    if (prevProps.isStreaming !== nextProps.isStreaming) {
      return false; // State changed, need to re-render
    }

    // Check if the setSelectedResponseId function reference changed
    if (prevProps.setSelectedResponseId !== nextProps.setSelectedResponseId) {
      return false; // Function reference changed, need to re-render
    }

    // Check if selectedResponseId changed
    if (prevProps.selectedResponseId !== nextProps.selectedResponseId) {
      return false; // Selection changed, need to re-render
    }

    // Check if setMobilePreviewShown changed
    if (prevProps.setMobilePreviewShown !== nextProps.setMobilePreviewShown) {
      return false; // Mobile preview function changed, need to re-render
    }

    // If we get here, props are equal enough to skip re-render
    return true;
  }
);

export default Message;

// Welcome screen component shown when no messages are present
export const WelcomeScreen = memo(() => {
  return (
    <div className="text-accent-02 mx-auto max-w-2xl space-y-4 px-12 pt-8 text-center italic">
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

      <div className="mt-8">
        <h3 className="py-2 font-semibold">About Fireproof</h3>
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
