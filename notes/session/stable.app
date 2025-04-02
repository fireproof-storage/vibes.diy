import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { ChatMessage, Segment, AiChatMessage, SessionDocument } from './types/chat';
import { useFireproof } from 'use-fireproof';
import SessionSidebar from './components/SessionSidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import QuickSuggestions from './components/QuickSuggestions';
import { FIREPROOF_CHAT_HISTORY } from './config/env';

// Updated interface to match useSimpleChat's return value
interface ChatInterfaceProps {
  chatState: {
    messages: ChatMessage[];
    setMessages: (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isStreaming: () => boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    autoResizeTextarea: () => void;
    scrollToBottom: () => void;
    sendMessage: () => Promise<void>;
    currentSegments: () => Segment[];
    getCurrentCode: () => string;
    title: string;
    setTitle: (title: string) => Promise<void>;
    sessionId?: string | null;
    isLoadingMessages?: boolean;
    streamingState: boolean;
  };
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
  onNewChat?: () => void;
}

// Helper function to encode titles for URLs
function encodeTitle(title: string): string {
  return encodeURIComponent(title || 'untitled-session')
    .toLowerCase()
    .replace(/%20/g, '-');
}

function logDebug(message: string) {
  console.debug(`🔍 CHAT_INTERFACE: ${message}`);
}

function ChatInterface({ chatState, sessionId, onSessionCreated, onNewChat }: ChatInterfaceProps) {
  // Extract commonly used values from chatState to avoid repetition
  const {
    messages,
    setMessages,
    input,
    setInput,
    isStreaming,
    inputRef,
    messagesEndRef,
    autoResizeTextarea,
    scrollToBottom,
    sendMessage,
    currentSegments,
    getCurrentCode,
    title,
    setTitle,
    sessionId: chatSessionId,
    isLoadingMessages,
    streamingState,
  } = chatState;

  const { database } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const databaseRef = useRef(database);

  // Use refs to maintain stable references to functions
  const setMessagesRef = useRef(setMessages);
  const scrollToBottomRef = useRef(scrollToBottom);

  // State for UI transitions and sharing
  const [isShrinking, setIsShrinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isFetchingSession, setIsFetchingSession] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Sidebar visibility functions
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Update refs when values change
  useEffect(() => {
    setMessagesRef.current = setMessages;
    scrollToBottomRef.current = scrollToBottom;
  }, [setMessages, scrollToBottom]);

  // Function to load session data
  async function loadSessionData() {
    if (sessionId && !isFetchingSession) {
      setIsFetchingSession(true);
      try {
        const sessionDoc = (await databaseRef.current.get(sessionId)) as SessionDocument;
        if (!sessionDoc) {
          throw new Error('No session found or invalid session data');
        }

        // If the session has a title, update it
        if (sessionDoc.title) {
          await setTitle(sessionDoc.title);
        }

        // Note: We no longer need to manually load messages since MessageList
        // will use useSessionMessages to get messages directly
      } catch (error) {
        console.error('ChatInterface: Error loading session:', error);
      } finally {
        setIsFetchingSession(false);
      }
    }
  }

  // Load session data when sessionId changes
  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  // Save session data when title changes
  useEffect(() => {
    // Title is now managed by the useSession hook inside useSimpleChat
    // We no longer need to manually save it
  }, []);

  // Create a new chat session
  const handleNewChat = useCallback(() => {
    // First trigger animation
    setIsShrinking(true);

    // Then redirect to home page after animation
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  }, []);

  // Handle session creation callback
  const handleSessionCreated = (newSessionId: string) => {
    onSessionCreated?.(newSessionId);
  };

  // Compute current streaming message text
  const currentStreamedText = useMemo(() => {
    const lastAiMessage = [...messages]
      .reverse()
      .find((msg): msg is AiChatMessage => msg.type === 'ai' && Boolean(msg.isStreaming));
    return lastAiMessage?.text || '';
  }, [messages]);

  // Function to handle input changes
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  // Function to handle keyboard events in textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isStreaming()) {
        e.preventDefault();
        sendMessage();
      }
    },
    [isStreaming, sendMessage]
  );

  // Function to handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      setInput(suggestion);

      // Focus the input and position cursor at the end
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Move cursor to end of text
          inputRef.current.selectionStart = inputRef.current.selectionEnd = suggestion.length;
        }
      }, 0);
    },
    [setInput]
  );

  // Memoize the MessageList component to prevent unnecessary re-renders
  const memoizedMessageList = useMemo(() => {
    logDebug(`Creating MessageList with sessionId=${sessionId}, messages=${messages.length}, isStreaming=${streamingState}`);
    if (messages.length > 0) {
      messages.forEach((msg, i) => {
        if (msg.type === 'ai') {
          const aiMsg = msg as AiChatMessage;
          logDebug(`  Message ${i}: type=${msg.type}, isStreaming=${aiMsg.isStreaming}, segments=${aiMsg.segments?.length || 0}, text length=${msg.text?.length || 0}`);
        } else {
          logDebug(`  Message ${i}: type=${msg.type}, text length=${msg.text?.length || 0}`);
        }
      });
    }

    return (
      <MessageList
        sessionId={sessionId || null}
        isStreaming={() => streamingState}
        currentSegments={currentSegments}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    );
  }, [sessionId, messages, streamingState, isShrinking, isExpanding, currentSegments]);

  // Render the quick suggestions conditionally
  const quickSuggestions = useMemo(
    () =>
      messages.length === 0 ? (
        <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />
      ) : null,
    [messages.length, handleSelectSuggestion]
  );

  // Auto-resize textarea when input changes
  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);

  // Show typing indicator when generating
  useEffect(() => {
    if (isStreaming()) {
      scrollToBottomRef.current();
    }
  }, [scrollToBottom]);

  // Update any checks for streaming state to use the direct streamingState value
  // instead of calling isStreaming() function
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Don't allow submission while streaming
    if (streamingState) {
      return;
    }

    // ... rest of the function ...
  };

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader
        onOpenSidebar={openSidebar}
        onNewChat={onNewChat || (() => {})}
        isStreaming={isStreaming}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-1 flex-col">
          {memoizedMessageList}
          {quickSuggestions}
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            disabled={isStreaming()}
            inputRef={inputRef}
          />
        </div>
      </div>
      <SessionSidebar isVisible={isSidebarVisible} onClose={closeSidebar} />
    </div>
  );
}

export default ChatInterface;
@import 'tailwindcss';

@theme {
  /* Color definitions - these will be available as bg-midnight, text-tahiti, etc. */
  --color-midnight: #333;
  --color-tahiti: #999;
  --color-bermuda: #ccc;

  /* Light mode colors */
  --color-light-primary: #333;
  --color-light-secondary: #333;
  --color-light-decorative-00: #eee;
  --color-light-decorative-01: #ddd;
  --color-light-decorative-02: #333;
  --color-light-background-00: #fff;
  --color-light-background-01: #eee;
  --color-light-background-02: #ddd;

  /* Dark mode colors */
  --color-dark-primary: #fff;
  --color-dark-secondary: #fff;
  --color-dark-decorative-00: #333;
  --color-dark-decorative-01: #444;
  --color-dark-decorative-02: #fff;
  --color-dark-background-00: #111;
  --color-dark-background-01: #222;
  --color-dark-background-02: #222;

  /* Accent colors - Light mode */
  --color-accent-00-light: #aaa;
  --color-accent-01-light: #999;
  --color-accent-02-light: #888;
  --color-accent-03-light: #777;

  /* Accent colors - Dark mode */
  --color-accent-00-dark: #bbb;
  --color-accent-01-dark: #aaa;
  --color-accent-02-dark: #777;
  --color-accent-03-dark: #666;

  --font-sans:
    'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
    'Segoe UI Symbol', 'Noto Color Emoji';
}

html,
body {
  @apply bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary;
  margin: 0;
  padding: 0;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100%;

  @media (prefers-color-scheme: dark) {
    color-scheme: dark;
  }
}

#root {
  height: 100%;
}

button {
  font-family: inherit;
}

/* Ensure all buttons and links show pointer cursor on hover */
button,
a,
[role='button'],
[type='button'],
[type='submit'],
[type='reset'] {
  cursor: pointer;
}

.light {
  --sp-layout-height: 100vh !important;
}

/* Animation for share status message */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Animation for new chat bounce effect */
@keyframes bounceIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out forwards;
}

.animate-bounce-in {
  animation: bounceIn 0.5s ease-out forwards;
}

/* Add the color utility classes */
.accent-00 {
  @apply bg-accent-00-light dark:bg-accent-00-dark;
}

.accent-01 {
  @apply bg-accent-01-light dark:bg-accent-01-dark;
}

.accent-02 {
  @apply bg-accent-02-light dark:bg-accent-02-dark;
}

.accent-03 {
  @apply bg-accent-03-light dark:bg-accent-03-dark;
}

.text-accent-00 {
  @apply text-accent-00-light dark:text-accent-00-dark;
}

.text-accent-01 {
  @apply text-accent-01-light dark:text-accent-01-dark;
}

.text-accent-02 {
  @apply text-accent-02-light dark:text-accent-02-dark;
}

.text-accent-03 {
  @apply text-accent-03-light dark:text-accent-03-dark;
}

.decorative-00 {
  @apply bg-light-decorative-00 dark:bg-dark-decorative-00;
}

.decorative-01 {
  @apply bg-light-decorative-01 dark:bg-dark-decorative-01;
}

.decorative-02 {
  @apply bg-light-decorative-02 dark:bg-dark-decorative-02;
}

.bg-primary {
  @apply bg-light-background-00 dark:bg-dark-background-00;
}

.bg-secondary {
  @apply bg-light-background-01 dark:bg-dark-background-01;
}

.bg-tertiary {
  @apply bg-light-background-02 dark:bg-dark-background-02;
}

/* Button glimmer animation */
@keyframes buttonGlimmer {
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.glimmer-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    transparent 10%,
    rgba(255, 145, 0, 0.2) 15%,
    rgba(255, 166, 0, 0.2) 20%,
    rgba(255, 216, 107, 0.2) 35%,
    rgba(255, 255, 255, 0.2) 40%,
    transparent 70%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  background-position: -100% 0;
  animation: buttonGlimmer 4.5s infinite;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dark mode adjustment */
@media (prefers-color-scheme: dark) {
  .glimmer-overlay {
    background: linear-gradient(
      120deg,
      transparent 0%,
      transparent 10%,
      rgba(255, 140, 0, 0.2) 20%,
      rgba(253, 158, 6, 0.2) 33%,
      rgba(255, 136, 0, 0.2) 40%,
      transparent 70%
    );
    background-size: 200% 100%;
    background-repeat: no-repeat;
    background-position: -100% 0;
    animation: buttonGlimmer 4.5s infinite;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* Default (Light Mode) Button Gradients */
.light-gradient {
  background: linear-gradient(
    110deg,
    transparent 0%,
    rgba(255, 255, 255, 1) 45%,
    white 89%,
    rgba(255, 166, 0, 0.3) 97%,
    rgba(255, 145, 0, 0.6) 100%
  );
}

/* Dark Mode Button Gradients */
@media (prefers-color-scheme: dark) {
  .light-gradient {
    background: linear-gradient(
      110deg,
      transparent 0%,
      rgba(0, 0, 0, 1) 45%,
      black 89%,
      rgb(255, 135, 29, 0.3) 97%,
      rgb(255, 135, 29, 0.5) 100%
    );
  }
}

.pulsing {
  width: 100%;
  height: auto;
  transform: rotate(-5deg) scale(4);
  animation: pulse 8s infinite;
}

@keyframes pulse {
  0% {
    transform: rotate(-5deg) scale(1);
  }
  50% {
    transform: rotate(0deg) scale(1.05);
  }
  100% {
    transform: rotate(-5deg) scale(1);
  }
}
.logo-pulse {
  transform: rotate(-5deg) scale(4);
  animation: logo-rotate 30s ease-in-out infinite;
}

@keyframes logo-rotate {
  0% {
    transform: rotate(0deg) scale(1);
  }
  66% {
    transform: rotate(45deg) scale(2.5);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}
import type { ReactNode } from 'react';

interface AppLayoutProps {
  chatPanel: ReactNode;
  previewPanel: ReactNode;
}

/**
 * AppLayout - Common layout component for the application
 * Provides consistent structure with 1:3 ratio between chat panel and preview panel
 */
export default function AppLayout({ chatPanel, previewPanel }: AppLayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="flex h-full w-1/3 flex-col">{chatPanel}</div>
      <div className="relative w-2/3">{previewPanel}</div>
    </div>
  );
}
import { memo } from 'react';
import { useNavigate } from 'react-router';

interface ChatHeaderProps {
  onOpenSidebar: () => void;
  onNewChat: () => void;
  isStreaming: () => boolean;
}

function ChatHeader({ onOpenSidebar, onNewChat, isStreaming }: ChatHeaderProps) {
  const navigate = useNavigate();

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault();
    onNewChat();
    // Navigation will happen in the onNewChat callback
  };

  return (
    <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 flex min-h-[4rem] items-center justify-between border-b px-6 py-4">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark mr-3"
          aria-label="Open chat history"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        </button>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={handleNewChat}
          className="peer bg-accent-02-light dark:bg-accent-02-dark hover:bg-accent-03-light dark:hover:bg-accent-03-dark flex cursor-pointer items-center justify-center rounded-full p-2.5 text-white transition-colors"
          aria-label="New Chat"
          title="New Chat"
        >
          <span className="sr-only">New Chat</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <span className="pointer-events-none absolute top-full right-0 mt-1 rounded bg-gray-800 px-2 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity peer-hover:opacity-100">
          New Chat
        </span>
      </div>
    </div>
  );
}

// Use React.memo with a custom comparison function to ensure the component only
// re-renders when its props actually change
export default memo(ChatHeader, (prevProps, nextProps) => {
  // Only re-render if isStreaming changes
  // Note: Functions should be memoized by parent components
  return (
    prevProps.onOpenSidebar === nextProps.onOpenSidebar &&
    prevProps.onNewChat === nextProps.onNewChat &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, memo } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

function ChatInput({ value, onChange, onSend, onKeyDown, disabled, inputRef }: ChatInputProps) {
  // Initial auto-resize
  useEffect(() => {
    // Auto-resize logic
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  }, [value, inputRef]);

  return (
    <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-01 dark:bg-dark-background-01 border-t px-4 py-3">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="border-light-decorative-00 dark:border-dark-decorative-00 text-light-primary dark:text-dark-primary bg-light-background-00 dark:bg-dark-background-00 focus:ring-accent-01-light dark:focus:ring-accent-01-dark max-h-[200px] min-h-[90px] w-full resize-y rounded-xl border p-2.5 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="Vibe coding? Use Fireproof."
          disabled={disabled}
          rows={2}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className={`light-gradient dark:dark-gradient absolute right-0 bottom-0 -mr-2 -mb-1 flex w-[110px] items-center justify-center overflow-hidden rounded-lg border px-1 py-2 shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md active:shadow-inner dark:hover:border-gray-600 ${
            disabled
              ? 'border-gray-300 dark:border-gray-500'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          style={{
            backdropFilter: 'blur(1px)',
          }}
          aria-label={disabled ? 'Generating' : 'Send message'}
        >
          {disabled && <div className="glimmer-overlay" />}
          <div className="relative z-10">
            <img
              src="/fp-logo.svg"
              alt="Fireproof"
              className="block h-5 transition-all hover:brightness-110 active:brightness-125 dark:hidden"
            />
            <img
              src="/fp-logo-white.svg"
              alt="Fireproof"
              className="hidden h-5 transition-all hover:brightness-110 active:brightness-125 dark:block"
            />
          </div>
        </button>
      </div>
    </div>
  );
}

// Use memo to optimize rendering
export default memo(ChatInput);
import { useEffect, useRef, memo, useCallback, useMemo } from 'react';
import type { ChatMessage, AiChatMessage, Segment } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import StructuredMessage from './StructuredMessage';
import { useSessionMessages } from '../hooks/useSessionMessages';
import { logUIState, debugLog } from '../utils/debugLogging';

// Direct stdout logging for tests
function writeToStdout(message: string) {
  console.debug(`🔍 MESSAGE_LIST: ${message}`);
}

interface MessageListProps {
  sessionId: string | null;
  isStreaming: () => boolean;
  currentSegments?: () => Segment[];
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
          className={`rounded-lg px-4 py-2 max-w-[85%] ${
            isAI
              ? 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              : 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white'
          } ${isShrinking ? 'animate-width-shrink' : isExpanding ? 'animate-width-expand' : ''}`}
        >
          {isAI ? (
            <StructuredMessage segments={aiMessage.segments || []} isStreaming={aiMessage.isStreaming} />
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

function MessageList({
  sessionId,
  isStreaming,
  currentSegments,
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
    const hasStreaming = messages.some((msg) => msg.type === 'ai' && (msg as AiChatMessage).isStreaming);
    writeToStdout(`hasStreamingMessage check: ${hasStreaming}, messages=${messages.length}`);
    return hasStreaming;
  }, [messages]);

  // Only show typing indicator when no streaming message with content is visible yet
  const showTypingIndicator = useMemo(() => {
    if (!isStreaming()) return false;

    // Log the current state of messages for debugging
    writeToStdout(
      `🔍 MESSAGE LIST DEBUG: Total messages=${messages.length}, isStreaming=${isStreaming()}`
    );

    // IMPORTANT: Check if any AI message has segments with actual content
    let hasAnyContent = messages.some(
      (msg) => {
        if (msg.type === 'ai') {
          const aiMsg = msg as AiChatMessage;
          const hasText = aiMsg.text.length > 0;
          
          // Check if the message has any segments with actual content
          const hasSegmentsWithContent = 
            Array.isArray(aiMsg.segments) && 
            aiMsg.segments.length > 0 && 
            aiMsg.segments.some(segment => 
              segment && segment.content && segment.content.trim().length > 0
            );
          
          // Log individual message details for each AI message
          writeToStdout(
            `🔍 AI MESSAGE ${aiMsg.timestamp || 'unknown'}: text length=${aiMsg.text.length}, ` +
            `segments=${aiMsg.segments?.length || 0}, hasContent=${hasText || hasSegmentsWithContent}, ` +
            `isStreaming=${aiMsg.isStreaming}`
          );
          
          if (aiMsg.segments && aiMsg.segments.length > 0) {
            aiMsg.segments.forEach((segment, i) => {
              if (segment) {
                const contentPreview = segment.content 
                  ? `${segment.content.substring(0, 20)}${segment.content.length > 20 ? '...' : ''}`
                  : '[empty]';
                  
                writeToStdout(
                  `  Segment ${i}: type=${segment.type}, length=${segment.content?.length || 0}, ` +
                  `content="${contentPreview}"`
                );
              }
            });
          }
          
          return hasText || hasSegmentsWithContent;
        }
        return false;
      }
    );

    // Also check currentSegments prop if available
    if (!hasAnyContent && currentSegments) {
      const segments = currentSegments();
      writeToStdout(`🔍 CHECKING CURRENT SEGMENTS: count=${segments.length}`);
      
      if (segments.length > 0) {
        segments.forEach((segment, i) => {
          if (segment) {
            const contentPreview = segment.content 
              ? `${segment.content.substring(0, 20)}${segment.content.length > 20 ? '...' : ''}`
              : '[empty]';
              
            writeToStdout(
              `  Segment ${i}: type=${segment.type}, length=${segment.content?.length || 0}, ` +
              `content="${contentPreview}"`
            );
          }
        });
        
        hasAnyContent = segments.some(segment => 
          segment && segment.content && segment.content.trim().length > 0
        );
        
        writeToStdout(`🔍 Current segments has content: ${hasAnyContent}`);
      }
    }

    // We only want to show the typing indicator if there's no content at all
    const shouldShowTypingIndicator = !hasAnyContent;

    // Log the final decision for the typing indicator
    writeToStdout(
      `🔍 DECISION: hasAnyContent=${hasAnyContent}, showTypingIndicator=${shouldShowTypingIndicator}`
    );

    return shouldShowTypingIndicator;
  }, [isStreaming, messages, currentSegments]);

  // Memoize the message list to prevent unnecessary re-renders
  const messageElements = useMemo(() => {
    writeToStdout(`Preparing to render ${messages.length} messages, showTypingIndicator=${showTypingIndicator}`);
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
        contentKey = aiMsg.segments?.reduce((total, segment) => {
          return total + (segment?.content?.length || 0);
        }, 0) || 0;
        
        writeToStdout(`Will render message ${i}: type=${msg.type}, isStreaming=${aiMsg.isStreaming}, hasSegments=${aiMsg.segments?.length > 0}, textLength=${msg.text.length}`);
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
          </div>
        )}
      </div>
    </div>
  );
}

// Only re-render when necessary to improve performance
export default memo(MessageList, (prevProps, nextProps) => {
  // Don't re-render if these props haven't changed
  const prevSegments = prevProps.currentSegments ? prevProps.currentSegments() : [];
  const nextSegments = nextProps.currentSegments ? nextProps.currentSegments() : [];
  const segmentsEqual = prevSegments.length === nextSegments.length;
  
  return (
    prevProps.sessionId === nextProps.sessionId &&
    prevProps.isStreaming() === nextProps.isStreaming() &&
    prevProps.isShrinking === nextProps.isShrinking &&
    prevProps.isExpanding === nextProps.isExpanding &&
    segmentsEqual
  );
});
interface QuickSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

function QuickSuggestions({ onSelectSuggestion }: QuickSuggestionsProps) {
  const suggestions = [
    {
      label: 'Todo App',
      text: 'Create a todo app with due dates and the ability to mark tasks as complete',
    },
    {
      label: 'Pomodoro',
      text: 'Create a pomodoro timer app with multiple timers work/break intervals and session tracking',
    },
    {
      label: 'Drawing App',
      text: 'Create a simple drawing app with a canvas where users can draw with different colors and save their drawings',
    },
    {
      label: 'Calculator',
      text: 'Create a calculator app with basic arithmetic operations',
    },
    {
      label: 'Photo Gallery',
      text: 'Create a photo gallery app with a grid of images and a modal for each image',
    },
    {
      label: 'Quiz App',
      text: 'Create a quiz app with a timer and score tracking',
    },
    {
      label: 'Wildcard',
      text: "Generate a wildcard app, something I wouldn't expect.",
    },
    {
      label: 'Music',
      text: 'Make a fan app where I can rate my favorite pop music lyrics',
    },
  ];

  return (
    <div className="bg-light-background-01 dark:bg-dark-background-01 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectSuggestion(suggestion.text)}
            className="bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickSuggestions;
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { sandpackDependencies } from '../../utils/versions';
import WelcomeScreen from './WelcomeScreen';
import SandpackEventListener from './SandpackEventListener';
import SandpackScrollController from './SandpackScrollController';

interface ResultPreviewProps {
  code: string;
  streamingCode?: string;
  dependencies?: Record<string, string>;
  onShare?: () => void;
  shareStatus?: string;
  isSharedApp?: boolean;
  completedMessage?: string;
  currentMessage?: { content: string };
  currentStreamContent?: string;
  onScreenshotCaptured?: (screenshotData: string) => void;
  initialView?: 'code' | 'preview';
  sessionId?: string;
}

const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              'light-primary': '#2C2C2C',
              'light-secondary': '#2C2C2C',
              'light-decorative-00': '#EBEAEA',
              'light-decorative-01': '#E0DEDE',
              'light-decorative-02': '#2C2C2C',
              'light-background-00': '#FFFFFF',
              'light-background-01': '#F5F5F5',
              'light-background-02': '#F0F0F0',
              'dark-primary': '#FFFFFF',
              'dark-secondary': '#FFFFFF',
              'dark-decorative-00': '#302F30',
              'dark-decorative-01': '#414141',
              'dark-decorative-02': '#FFFFFF',
              'dark-background-00': '#171616',
              'dark-background-01': '#201F20',
              'dark-background-02': '#201F20',
              'accent-00-light': '#F9A100',
              'accent-01-light': '#F58709',
              'accent-02-light': '#F16C12',
              'accent-03-light': '#EE521C',
              'accent-00-dark': '#FFAA0F',
              'accent-01-dark': '#FF8F0F',
              'accent-02-dark': '#FF7119',
              'accent-03-dark': '#FF612A',
            }
          }
        }
      }

      function captureScreenshot() {
        html2canvas(document.body).then(canvas => {
          const dataURI = canvas.toDataURL();
          window.parent.postMessage({ screenshot: dataURI }, '*');
        });
      }
      
      // Automatically capture screenshot when page is fully loaded
      window.addEventListener('load', function() {
        // Wait a short moment for any final rendering
        setTimeout(captureScreenshot, 500);
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>`;

const defaultCode = '';

function ResultPreview({
  code,
  streamingCode = '',
  dependencies = {},
  onShare,
  shareStatus,
  isSharedApp,
  completedMessage,
  currentMessage,
  currentStreamContent,
  onScreenshotCaptured,
  initialView = 'preview',
  sessionId,
}: ResultPreviewProps) {
  const [activeView, setActiveView] = useState<'preview' | 'code'>(initialView);
  const [displayCode, setDisplayCode] = useState(code || defaultCode);
  const [appStartedCount, setAppStartedCount] = useState(0);
  const [bundlingComplete, setBundlingComplete] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const codeEditorRef = useRef<HTMLDivElement>(null);
  const [lockCodeView, setLockCodeView] = useState(false);
  const filesRef = useRef({
    '/index.html': {
      code: indexHtml,
      hidden: true,
    },
    '/App.jsx': {
      code: code || defaultCode,
      active: true,
    },
  });

  // Simplify streaming detection - just check if the streamingCode exists
  const hasStreamingContent = Boolean(streamingCode && streamingCode.length > 0);

  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDarkMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.screenshot) {
        const screenshotData = event.data.screenshot;

        if (onScreenshotCaptured) {
          onScreenshotCaptured(screenshotData);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onScreenshotCaptured]);

  // Simplified code update logic - always use the most up-to-date code
  useEffect(() => {
    // Clean the code and add whitespace
    const processCode = (sourceCode: string) => {
      return cleanCodeBeforeImport(sourceCode) + '\n\n\n\n\n\n\n\n\n\n';
    };

    // IMPORTANT: Prioritize streaming code when it exists, otherwise use static code
    const codeToUse = streamingCode || code;

    if (codeToUse) {
      console.log(
        'ResultPreview: Updating code, lengths - streamingCode:',
        streamingCode?.length || 0,
        'code:',
        code?.length || 0
      );
      const processedCode = processCode(codeToUse);
      setDisplayCode(processedCode);

      filesRef.current = {
        ...filesRef.current,
        '/App.jsx': {
          code: processedCode,
          active: true,
        },
      };

      setShowWelcome(false);

      // Show code view during streaming
      if (hasStreamingContent) {
        setActiveView('code');
        setLockCodeView(true);
      } else {
        setLockCodeView(false);
      }
    }
  }, [code, streamingCode]);

  // Create a unique key for SandpackProvider that changes when relevant props change
  const sandpackKey = useMemo(() => {
    // Use the actual content that should trigger a remount
    return `${sessionId || 'default'}-${hasStreamingContent ? 'streaming' : 'static'}-${code.length}`;
  }, [sessionId, hasStreamingContent, code]);

  return (
    <div className="h-full" style={{ overflow: 'hidden' }}>
      <style>
        {`
          @keyframes spin-slow {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .animate-spin-slow {
            animation: spin-slow 1s linear infinite;
          }
        `}
      </style>
      <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 flex min-h-[4rem] items-center justify-between border-b px-6 py-4">
        {!showWelcome ? (
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex space-x-1 rounded-lg p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveView('preview')}
              className={`flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeView === 'preview'
                  ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
              }`}
              aria-label="Switch to preview"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${!bundlingComplete && !hasStreamingContent ? 'animate-spin-slow' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Preview icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('code');
                setShowWelcome(false);
              }}
              className={`flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeView === 'code'
                  ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
              }`}
              aria-label="Switch to code editor"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Code icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <span>Code</span>
            </button>
          </div>
        ) : (
          <div className="h-10"></div>
        )}
        {onShare ? (
          !showWelcome && (
            <div className="flex items-center gap-2">
              {shareStatus && (
                <div className="animate-fade-in bg-accent-00-light dark:bg-accent-00-dark text-light-primary dark:text-dark-primary rounded-lg px-3 py-1 text-sm">
                  {shareStatus}
                </div>
              )}
              <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex space-x-1 rounded-lg p-1 shadow-sm">
                <button
                  type="button"
                  onClick={onShare}
                  className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
                  aria-label="Share app"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Share icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="h-10 w-10"></div>
        )}
      </div>

      {showWelcome ? (
        <div className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
          <WelcomeScreen />
        </div>
      ) : (
        <div data-testid="sandpack-provider">
          <SandpackProvider
            key={sandpackKey}
            template="vite-react"
            options={{
              externalResources: ['https://cdn.tailwindcss.com'],
              classes: { 'sp-wrapper': 'h-full' },
            }}
            customSetup={{
              dependencies: {
                'use-fireproof': '0.20.0-dev-preview-52',
                ...(dependencies || {}),
              },
            }}
            files={filesRef.current}
            theme={isDarkMode ? 'dark' : 'light'}
          >
            <SandpackEventListener
              setActiveView={(view) => {
                if (!lockCodeView) {
                  setActiveView(view);
                }
              }}
              setBundlingComplete={setBundlingComplete}
              isStreaming={hasStreamingContent}
              onScreenshotCaptured={onScreenshotCaptured}
            />
            {hasStreamingContent && <SandpackScrollController isStreaming={hasStreamingContent} />}
            <SandpackLayout className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
              <div
                style={{
                  display: activeView === 'preview' ? 'block' : 'none',
                  height: '100%',
                  width: '100%',
                }}
              >
                <SandpackPreview
                  showNavigator={false}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={true}
                  showRestartButton={false}
                  showOpenNewtab={false}
                  className="h-full w-full"
                  style={{ height: '100%' }}
                />
              </div>
              <div
                style={{
                  display: activeView === 'code' ? 'block' : 'none',
                  height: '100%',
                  width: '100%',
                }}
                ref={codeEditorRef}
              >
                <SandpackCodeEditor
                  style={{ height: '100%' }}
                  showLineNumbers={false}
                  wrapContent
                  showInlineErrors
                />
              </div>
            </SandpackLayout>
          </SandpackProvider>
        </div>
      )}

      <div className="result-content">
        {!showWelcome && (
          <button
            data-testid="copy-button"
            onClick={() => navigator.clipboard.writeText(displayCode)}
            className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
          >
            Copy to Clipboard
          </button>
        )}
        {streamingCode ? (
          <div>{currentStreamContent}</div>
        ) : (
          <div>{completedMessage || currentMessage?.content || ''}</div>
        )}
      </div>
    </div>
  );
}

function cleanCodeBeforeImport(codeString: string) {
  return codeString.replace(/^[\s\S]*?(import|export)/, '$1');
}

export default ResultPreview;
import { useEffect } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';

interface SandpackEventListenerProps {
  setActiveView: (view: 'preview' | 'code') => void;
  setBundlingComplete: (complete: boolean) => void;
  isStreaming: boolean;
  onScreenshotCaptured?: (screenshotData: string) => void;
}

const SandpackEventListener: React.FC<SandpackEventListenerProps> = ({
  setActiveView,
  setBundlingComplete,
  isStreaming,
  onScreenshotCaptured,
}) => {
  const { listen } = useSandpack();

  useEffect(() => {
    setBundlingComplete(false);
    let startTime = Date.now();

    const resetTimer = () => {
      startTime = Date.now();
    };

    const unsubscribe = listen((message) => {
      if (message.type === 'start') {
        setBundlingComplete(false);
        resetTimer();
      } else if (message.type === 'urlchange') {
        setBundlingComplete(true);

        if (!isStreaming) {
          setActiveView('preview');

          // Screenshot capture logic
          if (onScreenshotCaptured) {
            const timeElapsed = Date.now() - startTime;
            const delay = timeElapsed < 1000 ? 1500 - timeElapsed : 500;

            setTimeout(() => {
              const sandpackPreview =
                document.querySelector<HTMLIFrameElement>('.sp-preview-iframe');
              if (sandpackPreview?.contentWindow) {
                try {
                  // Try to access the iframe content
                  const iframeDocument = sandpackPreview.contentWindow.document;
                  // Access html2canvas if available in the iframe (safe type cast)
                  const html2canvas = (sandpackPreview.contentWindow as any).html2canvas;

                  if (html2canvas && iframeDocument.body) {
                    html2canvas(iframeDocument.body, {
                      allowTaint: true,
                      useCORS: true,
                      backgroundColor: null,
                      scale: 2,
                    }).then((canvas: HTMLCanvasElement) => {
                      const screenshot = canvas.toDataURL('image/png');
                      onScreenshotCaptured(screenshot);
                    });
                  }
                } catch (e) {
                  console.error('Failed to capture screenshot:', e);
                }
              }
            }, delay);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [listen, setActiveView, setBundlingComplete, isStreaming, onScreenshotCaptured]);

  return null;
};

export default SandpackEventListener;
import { useEffect, useRef } from 'react';

interface SandpackScrollControllerProps {
  isStreaming: boolean;
}

const SandpackScrollController: React.FC<SandpackScrollControllerProps> = ({ isStreaming }) => {
  const lastScrollHeight = useRef(0);
  const lastScrollPosition = useRef(0);
  const isScrolling = useRef(false);
  const hasUserScrolled = useRef(false);
  const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let primaryScroller: HTMLElement | null = null;

    if (!document.getElementById('highlight-style')) {
      const style = document.createElement('style');
      style.id = 'highlight-style';
      style.textContent = `
        .cm-line-highlighted {
          position: relative !important;
          border-left: 3px solid rgba(0, 137, 249, 0.27) !important;
          color: inherit !important;
        }
        
        .cm-line-highlighted::before {
          content: "" !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: linear-gradient(60deg, rgba(0, 128, 255, 0.15), rgba(224, 255, 255, 0.25), rgba(0, 183, 255, 0.15)) !important;
          background-size: 200% 200% !important;
          animation: sparkleAppear 2s ease-out !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
        
        @keyframes sparkleGradient {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        
        @keyframes sparkleAppear {
          0% { opacity: 0.8; }
          50% { opacity: 0.8; }
          100% { opacity: 0.1; }
        }
      `;
      document.head.appendChild(style);
    }

    const scrollToBottom = () => {
      if (!primaryScroller) return;
      isScrolling.current = true;

      requestAnimationFrame(() => {
        if (primaryScroller) {
          primaryScroller.scrollTop = primaryScroller.scrollHeight;
          lastScrollHeight.current = primaryScroller.scrollHeight;
          lastScrollPosition.current = primaryScroller.scrollTop;
        }
        isScrolling.current = false;
      });
    };

    const highlightLastLine = () => {
      if (!primaryScroller || !isStreaming) return;

      document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
        el.classList.remove('cm-line-highlighted');
      });

      const lines = Array.from(document.querySelectorAll('.cm-line'));
      let lastLine = null;

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const content = line.textContent || '';
        if (content.trim() && !content.includes('END OF CODE')) {
          lastLine = line;
          break;
        }
      }

      if (lastLine) {
        lastLine.classList.add('cm-line-highlighted');
      }
    };

    const checkForScroller = setInterval(() => {
      if (primaryScroller) {
        clearInterval(checkForScroller);
        return;
      }

      const newScroller = document.querySelector('.cm-scroller');
      if (newScroller && newScroller instanceof HTMLElement) {
        primaryScroller = newScroller;

        scrollToBottom();

        setupContentObserver();
      }
    }, 100);

    const setupContentObserver = () => {
      if (!primaryScroller) return;

      const contentObserver = new MutationObserver(() => {
        if (!primaryScroller) return;

        const newHeight = primaryScroller.scrollHeight;

        if (isStreaming) {
          highlightLastLine();
        } else {
          document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
            el.classList.remove('cm-line-highlighted');
          });
        }

        if (newHeight === lastScrollHeight.current) return;

        const isNearBottom =
          primaryScroller.scrollTop + primaryScroller.clientHeight > lastScrollHeight.current - 100;

        if (!hasUserScrolled.current || isNearBottom) {
          scrollToBottom();
        }

        lastScrollHeight.current = newHeight;
      });

      const handleScroll = () => {
        if (isScrolling.current || !primaryScroller) return;

        const currentPosition = primaryScroller.scrollTop;
        if (Math.abs(currentPosition - lastScrollPosition.current) > 10) {
          hasUserScrolled.current = true;
          lastScrollPosition.current = currentPosition;

          if (
            primaryScroller.scrollTop + primaryScroller.clientHeight >=
            primaryScroller.scrollHeight - 50
          ) {
            hasUserScrolled.current = false;
          }
        }
      };

      if (primaryScroller) {
        contentObserver.observe(primaryScroller, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        primaryScroller.addEventListener('scroll', handleScroll);

        if (isStreaming) {
          highlightLastLine();
        }
      }

      if (isStreaming) {
        highlightIntervalRef.current = setInterval(highlightLastLine, 10);
      }

      return () => {
        clearInterval(checkForScroller);
        if (highlightIntervalRef.current) {
          clearInterval(highlightIntervalRef.current);
          highlightIntervalRef.current = null;
        }
        contentObserver.disconnect();
        primaryScroller?.removeEventListener('scroll', handleScroll);
      };
    };

    setTimeout(scrollToBottom, 100);

    return () => {
      clearInterval(checkForScroller);
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
        highlightIntervalRef.current = null;
      }
    };
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current);
      highlightIntervalRef.current = null;

      document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
        el.classList.remove('cm-line-highlighted');
      });
    }
  }, [isStreaming]);

  return null;
};

export default SandpackScrollController;
import React from 'react';

const WelcomeScreen = () => {
  return (
    <div className="bg-light-background-00 dark:bg-dark-background-00 flex h-full flex-col items-center justify-center">
      <img src="/lightup.png" alt="Lightup" className="logo-pulse h-auto w-full max-w-xs" />
    </div>
  );
};

export default WelcomeScreen;
import { useEffect, useRef, memo, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useSessionList, type GroupedSession } from '../hooks/sidebar/useSessionList';

function ImgFile({
  file,
  alt,
  className,
}: {
  file: { file: () => Promise<File>; type: string };
  alt: string;
  className: string;
}) {
  const [imgDataUrl, setImgDataUrl] = useState('');
  useEffect(() => {
    if (file.type && /image/.test(file.type)) {
      file.file().then((file: File) => {
        const src = URL.createObjectURL(file);
        setImgDataUrl(src);
        return () => URL.revokeObjectURL(src);
      });
    }
  }, [file]);
  return imgDataUrl ? (
    <img className={`${className} max-h-60 max-w-full object-contain`} alt={alt} src={imgDataUrl} />
  ) : null;
}

// Add these type definitions at the top of the file
interface DocBase {
  _id: string;
}

interface ScreenshotDocument extends DocBase {
  type: 'screenshot';
  session_id: string;
  _files?: {
    screenshot: { file: () => Promise<File>; type: string };
  };
}

// Modify SessionDocument to include optional type
interface SessionDocument extends DocBase {
  type?: 'session'; // Make it optional since existing docs might not have it
  title?: string;
  timestamp: number;
  messages?: Array<{
    text: string;
    type: 'user' | 'ai';
    code?: string;
    dependencies?: Record<string, string>;
  }>;
}

// Union type for documents returned by query
type SessionOrScreenshot = SessionDocument | ScreenshotDocument;

// Helper function to encode titles for URLs
function encodeTitle(title: string): string {
  return encodeURIComponent(title || 'untitled-session')
    .toLowerCase()
    .replace(/%20/g, '-');
}

interface SessionSidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Component that displays a collapsible sidebar with chat session history
 */
function SessionSidebar({ isVisible, onClose }: SessionSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Use the custom hook instead of direct database queries
  const { groupedSessions } = useSessionList();

  // Handle clicks outside the sidebar to close it
  useEffect(() => {
    if (!isVisible) return;

    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Memoize the sidebar classes to prevent recalculations on every render
  const sidebarClasses = useMemo(() => {
    return `bg-light-background-00 dark:bg-dark-background-00 fixed top-0 left-0 z-10 h-full shadow-lg transition-all duration-300 ${
      isVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
    }`;
  }, [isVisible]);

  // Render session items with Link components
  const renderSessionItems = () => {
    return groupedSessions.map(({ session, screenshots }) => {
      // Skip if this isn't a session document
      if (!session || !('_id' in session)) {
        return null;
      }

      const title = session.title || 'New Chat';
      const encodedTitle = encodeTitle(title);

      return (
        <li
          key={session._id}
          className="cursor-pointer border-b border-gray-200 p-3 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          data-testid="session-item"
        >
          <Link
            to={`/session/${session._id}/${encodedTitle}`}
            className="block"
            onClick={() => {
              // Close the sidebar on mobile
              if (window.innerWidth < 768) {
                onClose();
              }
            }}
          >
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(session.timestamp).toLocaleString()}
            </div>
            {screenshots.map(
              (screenshot) =>
                screenshot._files?.screenshot && (
                  <ImgFile
                    key={screenshot._id}
                    file={screenshot._files.screenshot}
                    alt={`Screenshot from ${title}`}
                    className="mt-2"
                  />
                )
            )}
          </Link>
        </li>
      );
    });
  };

  // Conditionally render content but keep animation classes
  return (
    <div
      ref={sidebarRef}
      className={`transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-full opacity-0'
      } absolute inset-y-0 left-0 z-10 flex w-80 flex-col border-r border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800`}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-light-primary dark:text-dark-primary text-lg font-semibold">
            App History
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark"
            aria-label="Close sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-2">
          {groupedSessions.length === 0 ? (
            <p className="text-light-secondary dark:text-dark-secondary p-2 text-sm">
              No saved sessions yet
            </p>
          ) : (
            <ul className="space-y-2">{renderSessionItems()}</ul>
          )}
        </div>
      </div>
    </div>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(SessionSidebar, (prevProps, nextProps) => {
  // Only re-render if isVisible changes
  // Note: Functions should be memoized by parent components
  return prevProps.isVisible === nextProps.isVisible && prevProps.onClose === nextProps.onClose;
});
import { memo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Segment } from '../types/chat';
import { logSegmentDetails, logUIState } from '../utils/debugLogging';

// Direct stdout logging for tests
function writeToStdout(message: string) {
  if (typeof process !== 'undefined' && process.stdout?.write) {
    process.stdout.write(`\n${message}\n`);
  } else {
    console.debug(message); 
  }
}

interface StructuredMessageProps {
  segments: Segment[];
  isStreaming?: boolean;
}

/**
 * Component for displaying structured messages with markdown and code segments
 */
const StructuredMessage = memo(({ segments, isStreaming }: StructuredMessageProps) => {
  // Ensure segments is an array (defensive)
  const validSegments = Array.isArray(segments) ? segments : [];

  // Log segments details on first render and when they change
  useEffect(() => {
    if (validSegments.length > 0) {
      writeToStdout(`🔍 STRUCTURED MESSAGE: Rendering with ${validSegments.length} segments, isStreaming=${isStreaming}`);
      
      validSegments.forEach((segment, i) => {
        const contentPreview = segment.content 
          ? `${segment.content.substring(0, 20)}${segment.content.length > 20 ? '...' : ''}`
          : '[empty]';
          
        writeToStdout(
          `🔍 SEGMENT ${i}: type=${segment.type}, content length=${segment.content?.length || 0}, ` +
          `content="${contentPreview}", has content=${Boolean(segment.content && segment.content.trim().length > 0)}`
        );
      });
    } else {
      writeToStdout('🔍 STRUCTURED MESSAGE: No segments to render');
    }
  }, [validSegments, isStreaming]);

  // Count number of lines in code segments
  const codeLines = validSegments
    .filter((segment) => segment.type === 'code')
    .reduce((acc, segment) => acc + (segment.content?.split('\n').length || 0), 0);

  // CRITICAL: We always want to show something if there's any content at all
  const hasContent =
    validSegments.length > 0 &&
    validSegments.some((segment) => segment?.content && segment.content.trim().length > 0);

  // Log UI state decision
  writeToStdout(
    `🔍 STRUCTURED MESSAGE: hasContent=${hasContent}, segments=${validSegments.length}, ` +
    `contentLength=${validSegments.reduce((total, seg) => total + (seg.content?.length || 0), 0)}`
  );

  return (
    <div className="structured-message">
      {!hasContent ? (
        // Show placeholder if there are no segments with content
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p>Processing response...</p>
        </div>
      ) : (
        // Map and render each segment that has content
        validSegments
          .filter((segment) => segment?.content && segment.content.trim().length > 0)
          .map((segment, index) => {
            if (segment.type === 'markdown') {
              return (
                <div
                  key={`markdown-${index}`}
                  className="prose prose-sm dark:prose-invert max-w-none"
                >
                  <ReactMarkdown>{segment.content || ''}</ReactMarkdown>
                </div>
              );
            } else if (segment.type === 'code') {
              // For code segments, show a summary with line count rather than full code
              const content = segment.content || '';
              return (
                <div
                  key={`code-${index}`}
                  className="my-4 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      {`${codeLines} line${codeLines !== 1 ? 's' : ''} of code`}
                    </span>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(content);
                      }}
                      className="rounded bg-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      Copy Code
                    </button>
                  </div>

                  {/* Preview of first few lines */}
                  <div className="max-h-24 overflow-hidden rounded bg-gray-100 p-2 font-mono text-sm dark:bg-gray-800">
                    {content
                      .split('\n')
                      .slice(0, 3)
                      .map((line, i) => (
                        <div key={i} className="truncate">
                          {line || ' '}
                        </div>
                      ))}
                    {content.split('\n').length > 3 && (
                      <div className="text-gray-500 dark:text-gray-400">...</div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })
      )}

      {/* Show streaming indicator only when streaming AND we already have content */}
      {isStreaming && hasContent && (
        <span className="bg-light-primary dark:bg-dark-primary ml-1 inline-block h-4 w-2 animate-pulse" />
      )}
    </div>
  );
});

StructuredMessage.displayName = 'StructuredMessage';

export default StructuredMessage;
/**
 * Central configuration file for environment variables
 * Provides fallback values for required environment variables
 */

// Fireproof database name
export const FIREPROOF_CHAT_HISTORY =
  import.meta.env.VITE_VIBES_CHAT_HISTORY || 'fireproof-chat-history';

// Other environment variables can be added here as needed
export const CALLAI_API_KEY = import.meta.env.VITE_CALLAI_API_KEY;
import { useMemo } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../../config/env';
import type { SessionDocument } from '../../types/chat';

/**
 * Type to represent either a session document or a screenshot document
 */
type SessionOrScreenshot = {
  _id: string;
  type?: 'session' | 'screenshot';
  session_id?: string;
  title?: string;
  timestamp?: number;
  created_at?: number;
  _files?: Record<string, any>;
};

/**
 * Type for grouped session data including its associated screenshots
 */
export type GroupedSession = {
  session: SessionDocument;
  screenshots: SessionOrScreenshot[];
};

/**
 * Custom hook for retrieving all sessions with their associated screenshots
 * Uses a single efficient query that gets both data types together
 * @returns An object containing the grouped sessions and loading state
 */
export function useSessionList() {
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  // Use a single query to fetch both sessions and screenshots with a custom index function
  // For session docs: returns doc._id
  // For screenshot docs: returns doc.session_id
  // This creates a virtual index where sessions and screenshots share the same key value
  const { docs: sessionAndScreenshots } = useLiveQuery<SessionOrScreenshot>((doc) =>
    doc.type && doc.type === 'session' ? doc._id : (doc as any).session_id
  );

  // Group sessions and their associated screenshots together
  const groupedSessions = useMemo(() => {
    if (!sessionAndScreenshots || sessionAndScreenshots.length === 0) {
      return [];
    }

    const groups = new Map<string, GroupedSession>();

    // Process all documents to group screenshots with their sessions
    sessionAndScreenshots.forEach((doc) => {
      if (doc.type === 'screenshot' && doc.session_id) {
        // Handle screenshot document
        const sessionId = doc.session_id;
        let group = groups.get(sessionId);

        if (!group) {
          // Create a placeholder for this session if it doesn't exist yet
          group = {
            session: { _id: sessionId } as SessionDocument,
            screenshots: [],
          };
          groups.set(sessionId, group);
        }

        // Add screenshot to this session's group
        group.screenshots.push(doc);
      } else if (doc.type === 'session') {
        // Handle session document
        let group = groups.get(doc._id);

        if (!group) {
          // Create a new group if this session hasn't been seen yet
          group = {
            session: doc as SessionDocument,
            screenshots: [],
          };
          groups.set(doc._id, group);
        } else {
          // Update the session data if we already have a group with screenshots
          group.session = doc as SessionDocument;
        }
      }
    });

    // Convert map to array and sort by timestamp (newest first)
    return Array.from(groups.values()).sort((a, b) => {
      const timeA = a.session.timestamp || 0;
      const timeB = b.session.timestamp || 0;
      return timeB - timeA;
    });
  }, [sessionAndScreenshots]);

  return {
    groupedSessions,
    count: groupedSessions.length,
  };
}
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, AiChatMessage, SessionDocument, Segment } from '../types/chat';

export function useSession(sessionId: string | null) {
  const { database, useDocument } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  console.log('useSession: initialized with sessionId:', sessionId);

  // Use a different approach to avoid TypeScript errors
  let initialDoc: any = sessionId
    ? { _id: sessionId, type: 'session', timestamp: Date.now() }
    : { type: 'session', title: 'New Chat', timestamp: Date.now() };

  // Use useDocument hook to interact with the session document
  const {
    doc: session,
    merge: mergeSession,
    save: saveSession,
  } = useDocument<SessionDocument>(initialDoc);

  // Log when session document changes
  useEffect(() => {
    console.log('useSession: session document:', session);
  }, [session]);

  // Load session data
  const loadSession = useCallback(async () => {
    if (!sessionId) return null;

    console.log('useSession: Loading session:', sessionId);
    setLoading(true);
    try {
      // No need to fetch manually, useDocument handles this
      console.log('useSession: Session loaded:', session);
      return session;
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId, session]);

  // Update session title
  const updateTitle = useCallback(
    async (title: string) => {
      if (!sessionId) return;

      try {
        await mergeSession({ title: title || 'Untitled Chat' });
        await saveSession();
      } catch (err) {
        console.error('Error updating session title:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, mergeSession, saveSession]
  );

  // Update session metadata
  const updateMetadata = useCallback(
    async (metadata: Partial<Omit<SessionDocument, '_id'>>) => {
      if (!sessionId) return;

      try {
        await mergeSession(metadata);
        await saveSession();
      } catch (err) {
        console.error('Error updating session metadata:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, mergeSession, saveSession]
  );

  // Add a screenshot to the session
  const addScreenshot = useCallback(
    async (screenshotData: string) => {
      if (!sessionId) return;

      try {
        const response = await fetch(screenshotData);
        const blob = await response.blob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        await database.put({
          type: 'screenshot',
          session_id: sessionId,
          _files: {
            screenshot: file,
          },
        });
      } catch (err) {
        console.error('Error adding screenshot:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, database]
  );

  // Create a new session
  const createSession = useCallback(
    async (title: string = 'New Chat') => {
      try {
        console.log('useSession: Creating new session with title:', title);
        await mergeSession({
          title,
          timestamp: Date.now(),
          type: 'session',
        });
        const result = await saveSession();
        console.log('useSession: Session created with ID:', result.id);
        return result.id;
      } catch (err) {
        console.error('Error creating session:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [mergeSession, saveSession]
  );

  return {
    session,
    loading,
    error,
    loadSession,
    updateTitle,
    updateMetadata,
    addScreenshot,
    createSession,
    database,
  };
}
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, AiChatMessage, UserChatMessage } from '../types/chat';
import { parseContent } from '../utils/segmentParser';
import { debugLog as logDebug } from '../utils/debugLogging';

/**
 * Message storage design (per human.md):
 * - Session documents are stored with useDocument in useSession hook (type: 'session')
 * - User messages are stored as separate documents (type: 'user-message')
 * - AI messages are only stored as complete messages after streaming (type: 'ai-message')
 * - All documents use created_at: Date.now() instead of timestamp
 * - All message documents include session_id to link them to a session
 */

// Define document types internally since we don't have a separate file
interface MessageDocument {
  type: 'user-message' | 'ai-message';
  session_id: string;
  created_at: number;
}

interface UserMessageDocument extends MessageDocument {
  type: 'user-message';
  prompt: string;
}

interface AiMessageDocument extends MessageDocument {
  type: 'ai-message';
  rawMessage: string;
}

// Helper to check if a document is a message document
const isMessageDocument = (doc: any): boolean => {
  return (
    doc && 
    (doc.type === 'user-message' || doc.type === 'ai-message') && 
    typeof doc.session_id === 'string'
  );
};

export function useSessionMessages(sessionId: string | null) {
  // Use ref to track prior sessionId for comparison
  const prevSessionIdRef = useRef<string | null>(null);
  
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  // Query for all message document types
  const { docs } = useLiveQuery('type', {
    keys: ['user-message', 'ai-message'],
    limit: 100,
  });

  // Debug log to check what docs are returned from Fireproof
  logDebug(`Fireproof docs returned: ${docs?.length || 0}, sessionId: ${sessionId}`);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Add state for current streaming message (memory only)
  const [streamingMessage, setStreamingMessage] = useState<AiChatMessage | null>(null);

  // Memoize parseContent to avoid regenerating in multiple places
  const parseMessageContent = useCallback((rawContent: string) => {
    return parseContent(rawContent);
  }, []);
  
  // Transform query results into messages - this is the main source of issues
  useEffect(() => {
    if (!docs) {
      logDebug('No docs available yet, waiting for data');
      return;
    }
    
    // Only process docs when needed - check if sessionId changed
    const sessionIdChanged = sessionId !== prevSessionIdRef.current;
    prevSessionIdRef.current = sessionId;
    
    // Exit early if no docs or no sessionId, preserving existing messages
    if (docs.length === 0 || !sessionId) {
      logDebug(`No docs found or no sessionId: { docsLength: ${docs?.length || 0}, sessionId: '${sessionId}' }`);
      // Only reset messages if we have a session ID but no docs
      // This allows virtual messages to persist when no sessionId exists
      if (sessionId && sessionIdChanged) {
        logDebug('Clearing messages because sessionId exists but no docs found');
        setMessages([]);
      }
      return;
    }

    // Skip reprocessing if sessionId hasn't changed
    if (!sessionIdChanged && messages.length > 0) {
      logDebug('SessionId unchanged, skipping reprocessing of messages');
      return;
    }

    // Filter for this session's messages
    const docsForThisSession = docs.filter(
      (doc: any) => isMessageDocument(doc) && doc.session_id === sessionId
    );
    logDebug(`Filtered ${docsForThisSession.length} docs for session: ${sessionId}`);

    const sortedMessages = docsForThisSession
      // Sort by created_at time
      .sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0))
      // Map to the appropriate message type
      .map((doc: any) => {
        if (doc.type === 'user-message') {
          const userDoc = doc as UserMessageDocument;
          return {
            type: 'user',
            text: userDoc.prompt,
            timestamp: userDoc.created_at, // Keep timestamp for compatibility
          } as UserChatMessage;
        } else {
          const aiDoc = doc as AiMessageDocument;
          // Parse raw content for AI messages
          const { segments, dependenciesString } = parseMessageContent(aiDoc.rawMessage);

          return {
            type: 'ai',
            text: aiDoc.rawMessage,
            segments,
            dependenciesString,
            isStreaming: false,
            timestamp: aiDoc.created_at, // Keep timestamp for compatibility
          } as AiChatMessage;
        }
      });

    logDebug(`Transformed ${sortedMessages.length} messages for session: ${sessionId}`);
    setMessages(sortedMessages);
  }, [docs, sessionId, parseMessageContent]);

  // Function to update streaming message directly (for external components)
  const updateStreamingMessage = useCallback((rawMessage: string, timestamp: number) => {
    console.debug(`🔍 UPDATE STREAMING: msg length=${rawMessage.length}, timestamp=${timestamp}`);
    const { segments, dependenciesString } = parseMessageContent(rawMessage);

    // Log what we're about to set as the streaming message
    console.debug(`🔍 SETTING STREAMING MESSAGE: ${segments.length} segments`);
    
    // Enhanced debugging for segments
    if (segments.length > 0) {
      segments.forEach((segment, i) => {
        console.debug(
          `🔍 STREAMING SEGMENT ${i}: type=${segment.type}, content length=${segment.content.length}, ` +
          `has content=${Boolean(segment.content && segment.content.trim().length > 0)}`
        );
      });
    }

    setStreamingMessage({
      type: 'ai',
      text: rawMessage,
      segments,
      dependenciesString,
      isStreaming: true,
      timestamp,
    } as AiChatMessage);
  }, [parseMessageContent]);

  // Add a new user message
  const addUserMessage = useCallback(async (text: string) => {
    try {
      const created_at = Date.now();
      
      // If sessionId is null, create a virtual message in memory only
      if (!sessionId) {
        logDebug(`Creating virtual user message (no sessionId available)`);
        // Use functional update to avoid stale closure issues
        setMessages(prevMessages => [
          ...prevMessages,
          {
            type: 'user',
            text,
            timestamp: created_at
          } as UserChatMessage
        ]);
        return created_at;
      }

      logDebug(`Adding user message to session: ${sessionId}`);
      const result = await database.put({
        type: 'user-message',
        session_id: sessionId,
        prompt: text,
        created_at,
      } as UserMessageDocument);

      logDebug(`Successfully added user message with ID: ${result.id}`);
      return created_at;
    } catch (error) {
      console.error('Error adding user message:', error);
      return null;
    }
  }, [sessionId, database]);

  // Add or update AI message with two modes:
  // 1. During streaming (isStreaming=true): Only update in-memory state, no database write
  // 2. Final message (isStreaming=false): Write to database and clear streaming state
  const addAiMessage = useCallback(async (
    rawMessage: string,
    created_at?: number,
    isStreaming: boolean = false
  ) => {
    const timestamp = created_at || Date.now();

    if (isStreaming) {
      // STREAMING MODE: Always update in-memory state even without sessionId
      logDebug('Updating streaming message in memory only');
      const { segments, dependenciesString } = parseMessageContent(rawMessage);

      // Enhanced debugging for streaming message updates
      console.debug(
        `🔍 ADD_AI_MESSAGE (streaming=true): Raw length=${rawMessage.length}, segments=${segments.length}`
      );
      
      if (segments.length > 0) {
        segments.forEach((segment, i) => {
          console.debug(
            `  Segment ${i}: type=${segment.type}, length=${segment.content.length}, ` +
            `has content=${Boolean(segment.content && segment.content.trim().length > 0)}`
          );
        });
      }

      setStreamingMessage({
        type: 'ai',
        text: rawMessage,
        segments,
        dependenciesString,
        isStreaming: true,
        timestamp,
      } as AiChatMessage);

      return timestamp;
    } else {
      // FINAL MESSAGE: Needs a sessionId to write to database
      if (!sessionId) {
        logDebug('Cannot save final message: sessionId is null');
        return null;
      }
      
      // Write to database and clear streaming state
      logDebug('Writing final AI message to database');

      const result = await database.put({
        type: 'ai-message',
        session_id: sessionId,
        rawMessage,
        created_at: timestamp,
      } as AiMessageDocument);

      // Clear streaming message when done
      setStreamingMessage(null);
      logDebug(`Created new AI message with ID: ${result.id}`);

      return timestamp;
    }
  }, [sessionId, database, parseMessageContent]);

  // Combine database messages with streaming message - this is a key source of issues
  const combinedMessages = useMemo(() => {
    // If no streaming message, just return the database messages
    if (!streamingMessage) return messages;

    // Enhanced check for streaming content - simplified to catch ANY valid content
    const hasStreamingContent = streamingMessage.text.trim().length > 0;
    
    // IMPORTANT CHANGE: Always include streaming message if it has ANY text content
    if (!hasStreamingContent) {
      return messages;
    }

    // If no sessionId, we might not have database messages, just add the streaming message
    if (!sessionId || messages.length === 0) {
      return [streamingMessage];
    }

    // Check if the streaming message already exists in the database messages
    const streamingMessageExists = messages.some(
      (msg) => msg.type === 'ai' && msg.timestamp === streamingMessage.timestamp
    );

    if (streamingMessageExists) {
      // Replace the database version with the streaming version
      return messages.map((msg) => {
        if (msg.type === 'ai' && msg.timestamp === streamingMessage.timestamp) {
          return streamingMessage;
        }
        return msg;
      });
    } else {
      // Add the streaming message to the list
      return [...messages, streamingMessage];
    }
  }, [messages, streamingMessage, sessionId]);

  const isLoading = !docs;

  // Return a stable object to ensure references don't change unnecessarily
  return useMemo(() => ({
    messages: combinedMessages,
    isLoading,
    addUserMessage,
    addAiMessage,
    updateStreamingMessage,
  }), [combinedMessages, isLoading, addUserMessage, addAiMessage, updateStreamingMessage]);
}
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatMessage, UserChatMessage, AiChatMessage, Segment } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import { useSession } from './useSession';
import { useSessionMessages } from './useSessionMessages';

const CHOSEN_MODEL = 'anthropic/claude-3.7-sonnet';

/**
 * Simplified chat hook that focuses on data-driven state management
 * Uses session-based architecture with individual message documents
 */
export function useSimpleChat(sessionId: string | null) {
  // Use our new hooks
  const { session, updateTitle } = useSession(sessionId);
  const {
    messages,
    addUserMessage,
    addAiMessage,
    updateStreamingMessage,
    isLoading: messagesLoading,
  } = useSessionMessages(sessionId);

  // Core state
  const [input, setInput] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [title, setTitle] = useState<string>(session?.title || 'New Chat');
  const [titleGenerated, setTitleGenerated] = useState<boolean>(false);

  // Refs for tracking streaming state
  const streamBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiMessageTimestampRef = useRef<number | null>(null);
  const [streamingState, setStreamingState] = useState<boolean>(false);

  // Initialize system prompt
  useEffect(() => {
    // Check if we're in a test environment
    if (import.meta.env.MODE === 'test') {
      setSystemPrompt('Test system prompt');
    } else {
      makeBaseSystemPrompt(CHOSEN_MODEL).then((prompt) => {
        setSystemPrompt(prompt);
      });
    }
  }, []);

  // Update title when session changes
  useEffect(() => {
    if (session?.title) {
      setTitle(session.title);
    }
  }, [session]);

  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if any AI message is currently streaming - simplified
  const isStreaming = useCallback((): boolean => {
    return streamingState;
  }, [streamingState]);

  // Function to build conversation history for the prompt
  function buildMessageHistory() {
    return messages.map((msg) => ({
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text,
    }));
  }

  /**
   * Get current segments from the last AI message or the streaming buffer
   * Simplified to always return segments, regardless of streaming state
   */
  const currentSegments = useCallback((): Segment[] => {
    // If we have content in the streaming buffer, use it
    if (streamBufferRef.current.length > 0) {
      const { segments } = parseContent(streamBufferRef.current);
      return segments;
    }

    // Otherwise find the last AI message
    const lastAiMessage = [...messages]
      .reverse()
      .find((msg): msg is AiChatMessage => msg.type === 'ai');

    // Return segments from the last AI message or empty array
    return lastAiMessage?.segments || [];
  }, [messages]);

  /**
   * Get the code from the current segments
   * Simplified to avoid streaming-specific logic
   */
  const getCurrentCode = useCallback((): string => {
    const segments = currentSegments();
    const codeSegment = segments.find((segment) => segment.type === 'code');
    return codeSegment?.content || '';
  }, [currentSegments]);

  /**
   * Generate a title based on the first two segments (markdown and code)
   * Returns a promise that resolves when the title generation is complete
   */
  async function generateTitle(aiTimestamp: number, segments: Segment[]): Promise<string | null> {
    try {
      // Get first markdown segment and first code segment (if they exist)
      const firstMarkdown = segments.find((seg) => seg.type === 'markdown');
      const firstCode = segments.find((seg) => seg.type === 'code');

      // Create content from the first two segments
      let titleContent = '';

      if (firstMarkdown) {
        titleContent += firstMarkdown.content + '\n\n';
      }

      if (firstCode) {
        titleContent += '```\n' + firstCode.content.split('\n').slice(0, 15).join('\n') + '\n```';
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_CALLAI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Fireproof App Builder',
        },
        body: JSON.stringify({
          model: CHOSEN_MODEL,
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that generates short, descriptive titles. Create a concise title (3-5 words) that captures the essence of the content. Return only the title, no other text or markup.',
            },
            {
              role: 'user',
              content: `Generate a short, descriptive title (3-5 words) for this app, use the React JSX <h1> tag's value if you can find it:\n\n${titleContent}`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newTitle = data.choices[0]?.message?.content?.trim() || 'New Chat';
        setTitle(newTitle);

        // Update the session title
        if (sessionId) {
          await updateTitle(newTitle);
          setTitleGenerated(true);
        }

        return newTitle;
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }

    return null;
  }

  // Near the top of the file, add a debug logging function
  function logDebug(message: string) {
    console.debug(`🔍 SIMPLE_CHAT: ${message}`);
  }

  /**
   * Send a message and process the AI response
   * Returns a promise that resolves when the entire process is complete, including title generation
   */
  async function sendMessage(): Promise<void> {
    if (input.trim()) {
      logDebug(`Starting sendMessage with input: ${input.substring(0, 30)}...`);
      logDebug(`Current sessionId: ${sessionId}`);

      // Reset state for new message
      streamBufferRef.current = '';
      setStreamingState(true);

      try {
        // Add user message
        logDebug('Adding user message to session');
        await addUserMessage(input);

        // Clear input
        setInput('');

        // Build message history
        const messageHistory = buildMessageHistory();
        logDebug(`Message history built, count: ${messageHistory.length}`);

        // Call OpenRouter API with streaming enabled
        logDebug('Calling OpenRouter API');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_CALLAI_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Fireproof App Builder',
          },
          body: JSON.stringify({
            model: CHOSEN_MODEL,
            stream: true,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              ...messageHistory,
              {
                role: 'user',
                content: input,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();

        // Create a timestamp for this AI message - we'll use it when storing the final message
        const aiMessageTimestamp = Date.now();
        aiMessageTimestampRef.current = aiMessageTimestamp;

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Process SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            // Skip OpenRouter processing messages
            if (line.startsWith(': OPENROUTER PROCESSING')) {
              continue;
            }

            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices && data.choices[0]?.delta?.content) {
                  const content = data.choices[0].delta.content;
                  // Add only the actual content to the buffer
                  streamBufferRef.current += content;

                  // IMPROVED IMPLEMENTATION: Update streaming message in memory only
                  // This avoids database writes during streaming
                  console.debug(
                    `🔍 STREAM CONTENT UPDATE: length=${streamBufferRef.current.length}`
                  );
                  updateStreamingMessageImplementation(
                    streamBufferRef.current,
                    aiMessageTimestampRef.current
                  );

                  // No need for log every 20 characters - removed for cleaner logs
                }
              } catch (e) {
                console.error('Error parsing SSE JSON:', e);
              }
            }
          }
        }

        // Streaming is done, NOW write the complete AI message to database
        logDebug(`Finalizing AI message (${streamBufferRef.current.length} chars)`);
        await addAiMessage(streamBufferRef.current, aiMessageTimestamp, false);
        setStreamingState(false);

        // Generate a title if this is the first response with code
        const { segments } = parseContent(streamBufferRef.current);
        const hasCode = segments.some((segment) => segment.type === 'code');

        logDebug(`Response has code: ${hasCode}, Session title: ${session?.title || 'none'}`);

        if (hasCode && (!session?.title || session.title === 'New Chat')) {
          logDebug('Generating title for session');
          await generateTitle(aiMessageTimestamp, segments);
        }
      } catch (error) {
        // Handle errors
        console.error('Error calling OpenRouter API:', error);
        const errorMessage =
          'Sorry, there was an error generating the component. Please try again.';
        // Add error message as AI message
        await addAiMessage(errorMessage);
        setStreamingState(false);
      } finally {
        aiMessageTimestampRef.current = null;
        logDebug('sendMessage completed');
      }
    }
  }

  // Helper for compatibility with current components
  const setMessages = useCallback(
    (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      console.warn('setMessages is deprecated. Use addUserMessage and updateAiMessage instead.');
      // This is just a stub for compatibility, we should remove it once components are updated
    },
    []
  );

  // Function used by the API stream handler to update streaming message
  function updateStreamingMessageImplementation(rawMessage: string, timestamp: number) {
    console.debug(`🔍 UPDATE_STREAMING: length=${rawMessage.length} timestamp=${timestamp}`);

    // Only process messages with actual content
    if (!rawMessage || rawMessage.trim().length === 0) {
      console.debug('🔍 EMPTY MESSAGE: Skipping empty streaming update');
      return;
    }

    // Ensure we properly parse content into segments
    const { segments, dependenciesString } = parseContent(rawMessage);

    // Log what segments we parsed
    console.debug(`🔍 PARSED ${segments.length} SEGMENTS for streaming message`);
    
    // Enhanced logging for debugging
    if (segments.length > 0) {
      segments.forEach((segment, i) => {
        console.debug(`  Segment ${i}: type=${segment.type}, length=${segment.content.length}`);
        // Add sample of content for debugging
        console.debug(`  Sample: "${segment.content.substring(0, Math.min(30, segment.content.length))}..."`);
      });
    }

    // CRITICAL FIX: Always create a simple markdown segment with the full content 
    // if no segments were parsed. This ensures content is shown immediately.
    if (segments.length === 0 && rawMessage.trim().length > 0) {
      segments.push({
        type: 'markdown',
        content: rawMessage,
      });
      console.debug('🔍 CREATED FALLBACK MARKDOWN SEGMENT from raw message text');
    }

    // Use addAiMessage with isStreaming=true to update in-memory message
    addAiMessage(rawMessage, timestamp, true).catch(console.error);

    // After parsing segments, add logging about state updates
    logDebug(`Setting ${segments.length} segments to message state`);
    logDebug(`Current messages count: ${messages.length}`);

    // In any function that updates messages state, add:
    logDebug(`Updating messages state with ${messages.length} messages`);
    messages.forEach((msg, i) => {
      if (msg.type === 'ai') {
        const aiMsg = msg as AiChatMessage;
        logDebug(`  Message ${i}: type=${msg.type}, isStreaming=${aiMsg.isStreaming}, segments=${aiMsg.segments?.length || 0}, text length=${msg.text?.length || 0}`);
      } else {
        logDebug(`  Message ${i}: type=${msg.type}, text length=${msg.text?.length || 0}`);
      }
    });
  }

  return {
    messages, // All messages in the conversation
    setMessages, // Function to update messages (legacy, to be removed)
    input, // Current user input text
    setInput, // Function to update input
    isStreaming, // Whether any AI message is currently streaming
    streamingState, // Direct access to streaming state
    sendMessage, // Function to send a message
    currentSegments, // Get current segments
    getCurrentCode, // Get current code
    inputRef, // Reference to the input textarea
    messagesEndRef, // Reference to the messages end div
    autoResizeTextarea, // Function to resize textarea
    scrollToBottom, // Function to scroll to bottom
    title, // Current chat title
    setTitle: updateTitle, // Function to update title
    titleGenerated,
    sessionId,
    isLoadingMessages: messagesLoading,
    updateStreamingMessage, // Directly expose the imported function
  };
}
{
  "name": "fireproof",
  "label": "useFireproof",
  "llmsTxtUrl": "https://use-fireproof.com/llms-full.txt",
  "module": "use-fireproof",
  "description": "local-first database with encrypted live sync"
}
const llmsModules = import.meta.glob('./llms/*.json', { eager: true });
const llmsList = Object.values(llmsModules).map(
  (mod) => (mod as { default: { llmsTxtUrl: string; label: string } }).default
);

// Base system prompt for the AI
export async function makeBaseSystemPrompt(model: string) {
  let concatenatedLlmsTxt = '';

  for (const llm of llmsList) {
    const llmsTxt = await fetch(llm.llmsTxtUrl).then((res) => res.text());
    concatenatedLlmsTxt += `
<${llm.label}-docs>
${llmsTxt}
</${llm.label}-docs>
`;
  }

  return `
You are an AI assistant tasked with creating React components. You should create components that:
- Use modern React practices and follow the rules of hooks
- Don't use any TypeScript, just use JavaScript
- Use Tailwind CSS for styling, have a orange synthwave vibe if unspecified
- For dynamic components, like autocomplete, don't use external libraries, implement your own
- Avoid using external libraries unless they are essential for the component to function
- Always import the libraries you need at the top of the file
- Use Fireproof for data persistence
- For file uploads use drag and drop and store using the doc._files API
- Don't try to generate png data, use placeholder image urls instead
- Consider and potentially reuse/extend code from previous responses if relevant
- Always output the full component code, keep the explanation short and concise
- Keep your component file shorter than 100 lines of code
- In the UI, include a vivid description of the app's purpose and detailed instructions how to use it, in italic text.
- Include a "Demo data" button that adds a handful of documents to the database to illustrate usage and schema

${concatenatedLlmsTxt}

IMPORTANT: You are working in one JavaScript file, use tailwind classes for styling.

If you need any npm dependencies, list them at the start of your response in this json format (note: use-fireproof is already provided, do not include it):
{dependencies: {
  "package-name": "version",
  "another-package": "version"
}}

Then provide a brief explanation followed by the component code. The component should demonstrate proper Fireproof integration with real-time updates and proper data persistence. 

Begin the component with the import statements. Use react and use-fireproof:

\`\`\`js
import { ... } from "react" // if needed
import { useFireproof } from "use-fireproof"
// other imports only when requested
\`\`\`

Start your response with {"dependencies": {"
`;
}

// Response format requirements
export const RESPONSE_FORMAT = {
  dependencies: {
    format: '{dependencies: { "package-name": "version" }}',
    note: 'use-fireproof is already provided, do not include it',
  },
  structure: [
    'Brief explanation',
    'Component code with proper Fireproof integration',
    'Real-time updates',
    'Data persistence',
  ],
};
import { useEffect } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

/**
 * Sets up theme detection based on system preferences
 */
function useThemeDetection() {
  useEffect(() => {
    // Check if user has dark mode preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply initial theme
    if (prefersDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set up listener for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
}

export function Layout({ children }: { children: React.ReactNode }) {
  useThemeDetection();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/unified-session.tsx'),
  route('session/:sessionId/:title?', './routes/unified-session.tsx', { id: 'session' }),
] satisfies RouteConfig;
import type { ChatMessage, AiChatMessage } from '../../types/chat';

export default function UnifiedSession() {
  // Beginning of the component - right after you get the chatState
  // Find where chatState is defined and add this right after it:
  
  // Rest of the component...
} import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import type { ChatMessage, AiChatMessage, Segment, SessionDocument } from '../types/chat';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import AppLayout from '../components/AppLayout';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import { useSession } from '../hooks/useSession';

export function meta() {
  return [
    { title: 'Fireproof App Builder' },
    { name: 'description', content: 'Build React components with AI' },
  ];
}

// Utility functions for URL state encoding/decoding
function encodeStateToUrl(code: string, dependencies: Record<string, string>) {
  try {
    const stateObj = { code, dependencies };
    const jsonStr = JSON.stringify(stateObj);
    const encoded = btoa(encodeURIComponent(jsonStr));
    return encoded;
  } catch (error) {
    console.error('Error encoding state to URL:', error);
    return '';
  }
}

function decodeStateFromUrl(encoded: string) {
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const stateObj = JSON.parse(jsonStr);
    return {
      code: stateObj.code || '',
      dependencies: stateObj.dependencies || {},
    };
  } catch (error) {
    console.error('Error decoding state from URL:', error);
    return { code: '', dependencies: {} };
  }
}

export default function UnifiedSession() {
  // Get sessionId from URL params if it exists
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Track whether we're in a shared app context
  const [isSharedApp, setIsSharedApp] = useState<boolean>(false);

  // State for current session
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId || null);
  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });
  const [shareStatus, setShareStatus] = useState<string>('');
  const sessionCreationAttemptedRef = useRef(false);

  // Initialize session management hook with current sessionId
  const { createSession, session } = useSession(sessionId);

  // Use the simple chat hook with current sessionId
  const chatState = useSimpleChat(sessionId);

  // Log state for debugging
  console.log('UnifiedSession: initialized with sessionId:', sessionId);
  console.log('UnifiedSession: chatState has messages:', chatState.messages.length);
  console.log('UnifiedSession: isStreaming:', chatState.streamingState);

  // Check if there's a state parameter in the URL (for shared apps)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const encodedState = searchParams.get('state');

    if (encodedState) {
      const decodedState = decodeStateFromUrl(encodedState);
      if (decodedState.code) {
        setState({
          generatedCode: decodedState.code,
          dependencies: decodedState.dependencies,
        });
        setIsSharedApp(true);
      }
    }
  }, [location.search]);

  // Create a new session when loaded without sessionId
  useEffect(() => {
    if (!urlSessionId && !sessionCreationAttemptedRef.current) {
      console.log('UnifiedSession: No sessionId in URL, but NOT creating new session yet');
      sessionCreationAttemptedRef.current = true;

      // We'll create a session only when the user sends their first message
      // This prevents immediate redirect from the root path
    }
  }, [urlSessionId, createSession, navigate]);

  // Helper function to extract dependencies from segments
  const getDependencies = useCallback(() => {
    const lastAiMessage = [...chatState.messages]
      .reverse()
      .find((msg): msg is AiChatMessage => msg.type === 'ai');

    if (lastAiMessage?.dependenciesString) {
      return parseDependencies(lastAiMessage.dependenciesString);
    }

    return {};
  }, [chatState.messages]);

  // Handle code generation from chat interface with stable callback reference
  const handleCodeGenerated = useCallback(
    (code: string, dependencies: Record<string, string> = {}) => {
      setState({
        generatedCode: code,
        dependencies,
      });
    },
    []
  );

  // Extract code and dependencies when AI message completes
  useEffect(() => {
    // Find the last AI message that is not streaming
    const lastAiMessage = [...chatState.messages]
      .reverse()
      .find((msg) => msg.type === 'ai' && !msg.isStreaming);

    // If we found a completed AI message, extract code and dependencies
    if (lastAiMessage && lastAiMessage.type === 'ai') {
      const code = chatState.getCurrentCode();
      if (code) {
        // Extract dependencies from segments
        const dependencies = getDependencies() || {};
        handleCodeGenerated(code, dependencies);
      }
    }
  }, [chatState.messages, chatState.getCurrentCode, getDependencies, handleCodeGenerated]);

  // Handle session creation
  const handleSessionCreated = useCallback(
    (newSessionId: string) => {
      setSessionId(newSessionId);
      // Update URL without full page reload
      navigate(`/session/${newSessionId}`, { replace: true });
    },
    [navigate]
  );

  // Handle new chat creation
  const handleNewChat = useCallback(() => {
    // Reset session creation flag
    sessionCreationAttemptedRef.current = false;

    // Navigate to home to create a new session
    navigate('/', { replace: true });

    // Reset state
    setSessionId(null);
    setState({
      generatedCode: '',
      dependencies: {},
    });
    setShareStatus('');
    setIsSharedApp(false);
  }, [navigate]);

  // Handle sharing functionality
  function handleShare() {
    if (!state.generatedCode) {
      alert('Generate an app first before sharing!');
      return;
    }

    const encoded = encodeStateToUrl(state.generatedCode, state.dependencies);
    if (encoded) {
      // Create a sharable URL with the encoded state
      const shareUrl = `${window.location.origin}/shared?state=${encoded}`;

      copyToClipboard(shareUrl);
      setShareStatus('Share URL copied to clipboard!');

      // Reset status after a brief delay
      setTimeout(() => {
        setShareStatus('');
      }, 3000);
    }
  }

  // Copy text to clipboard
  function copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log('Text copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err);
        });
    } else {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('Fallback: Could not copy text: ', err);
      }
    }
  }

  return (
    <AppLayout
      chatPanel={
        <ChatInterface
          chatState={chatState}
          sessionId={sessionId}
          onSessionCreated={handleSessionCreated}
          onNewChat={handleNewChat}
        />
      }
      previewPanel={
        <ResultPreview
          code={state.generatedCode}
          dependencies={state.dependencies}
          streamingCode={chatState.getCurrentCode()}
          isSharedApp={isSharedApp}
          shareStatus={shareStatus}
          onShare={handleShare}
          completedMessage={
            chatState.messages.length > 0
              ? chatState.messages.filter((msg) => msg.type === 'ai').pop()?.text || ''
              : ''
          }
          currentStreamContent={chatState
            .currentSegments()
            .filter((seg: Segment) => seg.type === 'markdown')
            .map((seg: Segment) => seg.content)
            .join('')}
          currentMessage={
            chatState.messages.length > 0
              ? { content: chatState.messages[chatState.messages.length - 1].text }
              : undefined
          }
        />
      }
    />
  );
}
import React from 'react';
import { render } from '@testing-library/react';
import ChatInterface from '../ChatInterface';
import { vi, describe, test, expect } from 'vitest';

/**
 * Tests for the ChatInterface component
 * This file verifies the fix for the 'input is not defined' error in ChatInterface.tsx
 */

// Mock the useFireproof hook
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {},
    useLiveQuery: () => ({ docs: [] }),
  }),
}));

// Prepare mock data
const mockChatState = {
  messages: [],
  setMessages: vi.fn(),
  input: 'test input',
  setInput: vi.fn(),
  isStreaming: () => false,
  streamingState: false,
  titleGenerated: false,
  inputRef: { current: null },
  messagesEndRef: { current: null },
  autoResizeTextarea: vi.fn(),
  scrollToBottom: vi.fn(),
  sendMessage: vi.fn(),
  currentSegments: () => [],
  getCurrentCode: () => '',
  title: 'Test Title',
  setTitle: vi.fn(),
  sessionId: 'test-session-id',
  isLoadingMessages: false,
};

describe('ChatInterface', () => {
  test('renders without error after fixing input destructuring', () => {
    // This test passes now that we've fixed the 'input is not defined' error
    // by properly destructuring input from chatState
    const { container } = render(<ChatInterface chatState={mockChatState} />);
    expect(container).toBeDefined();
  });
});
// Type definitions for segments
export type Segment = {
  type: 'markdown' | 'code';
  content: string;
};

// User message type
export type UserChatMessage = {
  type: 'user';
  text: string;
  timestamp?: number;
};

// AI message type
export type AiChatMessage = {
  type: 'ai';
  text: string; // Raw text content
  segments: Segment[]; // Parsed segments
  dependenciesString?: string; // Raw dependencies for downstream parsing
  isStreaming?: boolean; // Whether this message is currently streaming
  timestamp?: number;
};

// Union type for all message types
export type ChatMessage = UserChatMessage | AiChatMessage;

export interface SessionDocument {
  _id: string;
  type?: 'session'; // Document type for Fireproof queries
  title?: string;
  timestamp: number;
  messages?: ChatMessage[];
}

export interface ChatInterfaceProps {
  chatState: {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isGenerating: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    autoResizeTextarea: () => void;
    scrollToBottom: () => void;
    sendMessage: () => Promise<void>;
    currentSegments: () => Segment[];
    getCurrentCode: () => string;
  };
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
  onNewChat?: () => void;
  onCodeGenerated?: (code: string, dependencies?: Record<string, string>) => void;
}
/**
 * Debug logging utility for streaming content
 * 
 * This file provides consistent logging for both tests and production code.
 * It enables tracking the flow of streaming content and component rendering
 * to ensure consistent behavior across environments.
 */

// Always enable debug in test environment
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || 
                      process.env.NODE_ENV === 'test' || 
                      process.env.VITEST === 'true';

// Force log output in tests
const FORCE_LOG_IN_TESTS = true;

// Simple counter for tracking streaming updates
let updateCount = 0;

// Component render counts to detect potential re-rendering issues
const renderCounts: Record<string, number> = {};

/**
 * Reset the update counter (typically at the start of a new stream)
 */
export function resetStreamingUpdateCount() {
  updateCount = 0;
}

/**
 * Check if we're in a test environment
 */
function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/**
 * Log a streaming content update
 */
export function logStreamingUpdate(content: string, segmentsCount: number, streamingId?: string) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;
  
  const id = streamingId ? ` [${streamingId}]` : '';
  updateCount++;
  
  const message = `🔍 STREAM${id}: Update #${updateCount} - Content length=${content.length}, hasSegments=${segmentsCount > 0}`;
  
  // Format the output based on environment
  if (typeof window !== 'undefined') {
    // Browser environment
    console.debug(message);
  } else if (isTestEnvironment()) {
    // Test environment - write directly to stdout for cleaner output
    process.stdout.write(`\n${message}\n`);
  }
}

/**
 * Log segment details
 */
export function logSegmentDetails(segments: Array<{type: string; content?: string}>) {
  if ((!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) || !segments?.length) return;
  
  segments.forEach((segment, i) => {
    const previewContent = segment.content 
      ? `${segment.content.substring(0, 20)}${segment.content.length > 20 ? '...' : ''}`
      : '[empty]';
    
    const message = `🔍 SEGMENT ${i}: type=${segment.type}, content=${previewContent}`;
      
    if (typeof window !== 'undefined') {
      console.debug(message);
    } else if (isTestEnvironment()) {
      process.stdout.write(`\n${message}\n`);
    }
  });
}

/**
 * Log UI state decisions
 */
export function logUIState(
  componentName: string, 
  contentVisible: boolean, 
  segmentsCount: number,
  additionalInfo?: Record<string, any>
) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;
  
  // Track render counts
  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;
  
  const renderCount = renderCounts[componentName];
  const additionalInfoStr = additionalInfo 
    ? `, ${Object.entries(additionalInfo).map(([k, v]) => `${k}=${v}`).join(', ')}` 
    : '';
  
  const message = `🔍 UI STATE: ${componentName} render #${renderCount}, contentVisible=${contentVisible}, segmentsRendered=${segmentsCount}${additionalInfoStr}`;
    
  if (typeof window !== 'undefined') {
    console.debug(message);
  } else if (isTestEnvironment()) {
    process.stdout.write(`\n${message}\n`);
  }
}

/**
 * Log DOM verification for tests
 */
export function logDOMVerification(elementText: string, isFound: boolean) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;
  
  const message = `🔍 DOM CHECK: "${elementText}" is ${isFound ? 'FOUND' : 'NOT FOUND'} in document`;
  
  if (typeof window !== 'undefined') {
    console.debug(message);
  } else if (isTestEnvironment()) {
    process.stdout.write(`\n${message}\n`);
  }
}

/**
 * General debug log that works in any environment
 */
export function debugLog(message: string) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;
  
  if (typeof window !== 'undefined') {
    console.debug(message);
  } else if (isTestEnvironment()) {
    process.stdout.write(`\n${message}\n`);
  }
}

export default {
  resetStreamingUpdateCount,
  logStreamingUpdate,
  logSegmentDetails,
  logUIState,
  logDOMVerification,
  debugLog
}; import type { Segment } from '../types/chat';

/**
 * Parse content into segments of markdown and code
 * This is a pure function that doesn't rely on any state
 */
export function parseContent(text: string): {
  segments: Segment[];
  dependenciesString: string | undefined;
} {
  const segments: Segment[] = [];
  let dependenciesString: string | undefined;

  // Reduced debugging logs
  console.debug(`Parsing content, length: ${text.length}`);

  // Log the complete content once for debugging purposes
  console.debug('=== BEGINNING OF CONTENT ===');
  console.debug(text);
  console.debug('=== END OF CONTENT ===');

  // Extract dependencies from the first segment (if it exists)
  const depsMatch = text.match(/^(.*}})/s);
  if (depsMatch && depsMatch[1]) {
    dependenciesString = depsMatch[1];
    // Remove the dependencies part from the text
    text = text.slice(depsMatch[1].length);
  }

  // More robust code block detection - matching standard markdown code fence pattern
  // This will match ```language\n and ``` patterns
  const codeBlockRegex = /```(?:([a-zA-Z0-9]+)?\n)?/g;

  let match;
  let lastIndex = 0;
  let inCodeBlock = false;

  // Loop through all code block markers
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchLength = match[0].length;

    if (!inCodeBlock) {
      // This is the start of a code block
      // Add the text before this code block as markdown
      const markdownContent = text.substring(lastIndex, matchIndex);
      if (markdownContent.trim()) {
        segments.push({
          type: 'markdown',
          content: markdownContent,
        });
      }

      // Mark the position after this code block marker
      lastIndex = matchIndex + matchLength;
      inCodeBlock = true;
    } else {
      // This is the end of a code block
      // Add the code block content
      const codeContent = text.substring(lastIndex, matchIndex);
      if (codeContent) {
        segments.push({
          type: 'code',
          content: codeContent,
        });
      }

      // Mark the position after this code block marker
      lastIndex = matchIndex + matchLength;
      inCodeBlock = false;
    }
  }

  // Add any remaining content
  if (lastIndex < text.length) {
    segments.push({
      type: inCodeBlock ? 'code' : 'markdown',
      content: text.substring(lastIndex),
    });
  }

  // If no segments were created (which shouldn't happen but just in case)
  // treat the entire content as markdown
  if (segments.length === 0) {
    segments.push({
      type: 'markdown',
      content: text,
    });
  }

  // Final log showing what we produced
  console.debug(`🔍 SEGMENTS PARSED: ${segments.length} segments from text length ${text.length}`);
  if (segments.length > 0) {
    segments.forEach((segment, i) => {
      console.debug(`  Segment ${i}: type=${segment.type}, length=${segment.content.length}`);
    });
  }

  return { segments, dependenciesString };
}

/**
 * Extract dependencies as a Record from the dependencies string
 */
export function parseDependencies(dependenciesString?: string): Record<string, string> {
  if (!dependenciesString) return {};

  const dependencies: Record<string, string> = {};
  const matches = dependenciesString.match(/"([^"]+)"\s*:\s*"([^"]+)"/g);

  if (matches) {
    matches.forEach((match) => {
      const keyMatch = match.match(/"([^"]+)"\s*:/);
      const valueMatch = match.match(/:\s*"([^"]+)"/);

      if (keyMatch?.[1] && valueMatch?.[1]) {
        const key = keyMatch[1].trim();
        const value = valueMatch[1].trim();

        if (key && value) {
          dependencies[key] = value;
        }
      }
    });
  }

  return dependencies;
}
// This file exports package versions from package.json for use in the app
// Using Vite's import.meta.env to access the versions at build time

// Import the package.json using Vite's feature
import packageJson from '../../package.json';

// Extract the versions we need
export const fireproofVersion = packageJson.dependencies['use-fireproof'];
export const cementVersion = 'latest'; // Keep this as latest or extract from package.json if added there

// Export a dependencies object ready for sandpack
export const sandpackDependencies = {
  'use-fireproof': fireproofVersion,
  '@adviser/cement': cementVersion,
};
