import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ChatMessage, Segment, AiChatMessage } from './types/chat';
import { useFireproof } from 'use-fireproof';
import SessionSidebar from './components/SessionSidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import QuickSuggestions from './components/QuickSuggestions';

// Define updated document type to work with Fireproof correctly
interface SessionDocument {
  _id: string;
  title?: string;
  timestamp: number;
  messages?: ChatMessage[];
}

// Updated interface to match useSimpleChat's return value
interface ChatInterfaceProps {
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
    title: string;
    setTitle: React.Dispatch<React.SetStateAction<string>>;
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

function ChatInterface({
  chatState,
  sessionId,
  onSessionCreated,
  onNewChat,
}: ChatInterfaceProps) {
  // Extract commonly used values from chatState to avoid repetition
  const {
    messages,
    setMessages,
    input,
    setInput,
    isGenerating,
    inputRef,
    messagesEndRef,
    autoResizeTextarea,
    scrollToBottom,
    sendMessage,
    currentSegments,
    getCurrentCode,
    title,
    setTitle
  } = chatState;

  const { database } = useFireproof('sessions');
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
        const sessionDoc = await databaseRef.current.get(sessionId) as any as SessionDocument;
        if (!sessionDoc || !sessionDoc.messages) {
          throw new Error('No session found or invalid session data');
        }

        // Use the ref to access the latest setMessages function
        setMessagesRef.current(sessionDoc.messages);

        // If the session has a title, update it
        if (sessionDoc.title) {
          setTitle(sessionDoc.title);
        }
        
        // Get the last AI message with code 
        const lastAiMessage = [...sessionDoc.messages].reverse().find(
          (msg): msg is AiChatMessage => 
            msg.type === 'ai' && msg.segments.some((seg: Segment) => seg.type === 'code')
        );
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

  // Save session data when messages change
  useEffect(() => {
    const saveData = async () => {
      // If we have a sessionId and messages, save them
      if (sessionId && messages.length > 0) {
        try {
          // Get the current document or create a new one
          const sessionDoc = await databaseRef.current
            .get(sessionId)
            .catch(() => ({
              _id: sessionId,
              timestamp: Date.now(),
              title: title || 'New Chat',
            })) as any as SessionDocument;

          // Update with the current messages and title
          const updatedDoc = {
            ...sessionDoc,
            messages,
            title: title || 'New Chat',
            timestamp: Date.now(),
          };

          // Save to the database
          await databaseRef.current.put(updatedDoc);
        } catch (error) {
          console.error('ChatInterface: Error saving session:', error);
        }
      }
    };

    saveData();
  }, [messages, sessionId, title]);

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
    const lastAiMessage = [...messages].reverse().find(
      (msg): msg is AiChatMessage => 
        msg.type === 'ai' && Boolean(msg.isStreaming)
    );
    return lastAiMessage?.text || '';
  }, [messages]);

  // Function to handle input changes
  const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, [setInput]);

  // Function to handle keyboard events in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      sendMessage();
    }
  }, [isGenerating, sendMessage]);

  // Function to handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setInput(suggestion);
    
    // Focus the input and position cursor at the end
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Move cursor to end of text
        inputRef.current.selectionStart = inputRef.current.selectionEnd = suggestion.length;
      }
    }, 0);
  }, [setInput]);

  // Memoize the MessageList component to prevent unnecessary re-renders
  const memoizedMessageList = useMemo(
    () => (
      <MessageList
        messages={messages}
        isGenerating={isGenerating}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    ),
    [messages, isGenerating, currentStreamedText, isShrinking, isExpanding]
  );

  // Render the quick suggestions conditionally
  const quickSuggestions = useMemo(
    () => (messages.length === 0 ? <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} /> : null),
    [messages.length, handleSelectSuggestion]
  );

  // Auto-resize textarea when input changes
  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);

  // Show typing indicator when generating
  useEffect(() => {
    if (isGenerating) {
      scrollToBottomRef.current();
    }
  }, [scrollToBottom]);

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader
        onOpenSidebar={openSidebar}
        onNewChat={onNewChat || (() => {})}
        isGenerating={isGenerating}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col w-full">
          {memoizedMessageList}
          {quickSuggestions}
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            disabled={isGenerating}
            inputRef={inputRef}
          />
        </div>
      </div>
      <SessionSidebar
        isVisible={isSidebarVisible}
        onClose={closeSidebar}
      />
    </div>
  );
}

export default ChatInterface;
