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
  const memoizedMessageList = useMemo(
    () => (
      <MessageList
        sessionId={sessionId || null}
        isStreaming={isStreaming}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    ),
    [sessionId, isStreaming, isShrinking, isExpanding]
  );

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
