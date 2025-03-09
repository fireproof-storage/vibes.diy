import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { ChatMessage, SessionDocument } from './types/chat';
import { useFireproof } from 'use-fireproof';
import SessionSidebar from './components/SessionSidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import QuickSuggestions from './components/QuickSuggestions';
import { useChatContext } from './context/ChatContext';

interface ChatInterfaceProps {
  chatState: {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isGenerating: boolean;
    currentStreamedText: string;
    streamingCode: string;
    completedCode: string;
    isStreaming: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    autoResizeTextarea: () => void;
    scrollToBottom: () => void;
    sendMessage: () => Promise<void>;
    parserState: React.MutableRefObject<{
      inCodeBlock: boolean;
      codeBlockContent: string;
      dependencies: Record<string, string>;
      displayText: string;
      on: (event: string, callback: Function) => void;
      removeAllListeners: () => void;
      write: (chunk: string) => void;
      end: () => void;
      reset: () => void;
    }>;
    completedMessage: string;
  };
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
  onNewChat?: () => void;
  onCodeGenerated?: (code: string, dependencies?: Record<string, string>) => void;
}

// Helper function to encode titles for URLs
function encodeTitle(title: string): string {
  return encodeURIComponent(title || 'untitled-session')
    .toLowerCase()
    .replace(/%20/g, '-');
}

// Add a throttling mechanism to prevent excessive re-renders
function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

// ChatInterface component handles user input and displays chat messages
function ChatInterface({
  chatState,
  sessionId,
  onSessionCreated,
  onNewChat,
  onCodeGenerated,
}: ChatInterfaceProps) {
  const [isShrinking, setIsShrinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const { database, useLiveQuery } = useFireproof('fireproof-chat-history');

  const {
    messages,
    setMessages,
    input,
    setInput,
    isGenerating,
    currentStreamedText,
    inputRef,
    autoResizeTextarea,
    sendMessage,
  } = chatState;

  // Query chat sessions ordered by timestamp (newest first)
  const { docs: sessions } = useLiveQuery('timestamp', {
    descending: true,
  });

  // Get values from context when available
  const chatContext = useChatContext();

  // Create a ref to store setMessages function to avoid dependency cycles
  const setMessagesRef = useRef(setMessages);

  // Keep the ref updated with the latest setMessages function
  useEffect(() => {
    setMessagesRef.current = setMessages;
  }, [setMessages]);

  // Track if we are manually setting input to prevent feedback loops
  const isSettingInput = useRef(false);

  // Memoize handler functions to prevent re-renders
  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      // Set local state directly
      setInput(suggestion);

      // Focus the input after setting the value
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    },
    [inputRef, setInput]
  );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  // Auto-resize textarea when input changes
  useEffect(() => {
    autoResizeTextarea();
  }, [autoResizeTextarea]);

  // Keep the optimization for preventing unnecessary rerenders
  const prevPropsRef = useRef<{
    sessionId?: string | null;
    messages: ChatMessage[];
    isGenerating: boolean;
  }>({
    sessionId,
    messages: chatState.messages,
    isGenerating: chatState.isGenerating,
  });

  // Compare current props with previous
  const shouldRerender = !shallowEqual(
    {
      sessionId,
      messages: chatState.messages,
      isGenerating: chatState.isGenerating,
    },
    prevPropsRef.current
  );

  // Update the ref with current values
  useEffect(() => {
    if (shouldRerender) {
      prevPropsRef.current = {
        sessionId,
        messages: chatState.messages,
        isGenerating: chatState.isGenerating,
      };
    }
  });

  // Fixed popstate event listener to avoid repeated add/remove
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If there's a sessionId in the state, load that session
      if (event.state?.sessionId) {
        if (onSessionCreated) {
          onSessionCreated(event.state.sessionId);
        }
      } else {
        // If we're navigating to a page without a sessionId (like the home page)
        // call onNewChat if available
        if (onNewChat) {
          onNewChat();
        }
      }
    };

    // Create stable reference to callbacks
    const stableOnSessionCreated = onSessionCreated;
    const stableOnNewChat = onNewChat;

    // Add event listener for popstate events
    window.addEventListener('popstate', handlePopState);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Empty dependency array - this will only run once on mount and cleanup on unmount

  // Keep the separate effect to handle callback changes
  useEffect(() => {
    // This effect runs whenever onSessionCreated or onNewChat change
    // We don't need to do anything here, but could update any refs if needed
  }, [onSessionCreated, onNewChat]);

  // Load session data when sessionId changes
  useEffect(() => {
    async function loadSessionData() {
      if (sessionId) {
        try {
          const sessionData = (await database.get(sessionId)) as SessionDocument;
          // Normalize session data to guarantee messages array exists
          const messages = Array.isArray(sessionData.messages) ? sessionData.messages : [];
          // Use the ref to access the latest setMessages function
          setMessagesRef.current(messages);
        } catch (error) {
          console.error('Error loading session:', error);
        }
      }
    }

    loadSessionData();
  }, [sessionId, database]);

  // Track streaming state to detect when streaming completes
  const wasGeneratingRef = useRef(isGenerating);

  // Save messages to Fireproof ONLY when streaming completes or on message count change
  useEffect(() => {
    async function saveSessionData() {
      // Only save when streaming just completed (wasGenerating was true, but isGenerating is now false)
      const streamingJustCompleted = wasGeneratingRef.current && !isGenerating;

      if (messages.length > 0 && streamingJustCompleted) {
        // Extract title from first user message
        const firstUserMessage = messages.find((msg) => msg.type === 'user');
        const title = firstUserMessage?.text || 'Untitled Chat';

        try {
          const sessionData = {
            type: 'session',
            title,
            messages,
            timestamp: Date.now(),
            ...(sessionId ? { _id: sessionId } : {}),
          };

          const result = await database.put(sessionData);

          // If this was a new session, notify the parent component using optional chaining
          if (!sessionId) {
            // Update the URL in the browser history without reloading
            const encodedTitle = encodeTitle(title);
            const url = `/session/${result.id}/${encodedTitle}`;
            window.history.pushState({ sessionId: result.id }, '', url);

            // Notify parent component
            onSessionCreated?.(result.id);
          }
        } catch (error) {
          console.error('Error saving session to Fireproof:', error);
        }
      }

      // Update ref for next comparison
      wasGeneratingRef.current = isGenerating;
    }

    saveSessionData();
  }, [isGenerating, messages, sessionId, database, onSessionCreated]);

  // Load a session from the sidebar
  const handleLoadSession = useCallback(
    async (session: SessionDocument) => {
      // Ensure session has an _id - this is guaranteed by the component API
      const sessionId = session._id;

      try {
        const sessionData = (await database.get(sessionId)) as SessionDocument;
        // Normalize session data to guarantee messages array exists
        const messages = Array.isArray(sessionData.messages) ? sessionData.messages : [];
        // Use the ref to access the latest setMessages function
        setMessagesRef.current(messages);

        // Find the last AI message with code to update the editor
        const lastAiMessageWithCode = [...messages]
          .reverse()
          .find((msg: ChatMessage) => msg.type === 'ai' && msg.code);

        // If we found an AI message with code, update the code view
        if (lastAiMessageWithCode?.code) {
          const dependencies = lastAiMessageWithCode.dependencies || {};

          // 1. Update local chatState
          chatState.streamingCode = lastAiMessageWithCode.code;
          chatState.completedCode = lastAiMessageWithCode.code;
          chatState.parserState.current.dependencies = dependencies;
          chatState.isStreaming = false;
          chatState.isGenerating = false;

          // Manually extract the UI code for app preview
          chatState.completedMessage = lastAiMessageWithCode.text || "Here's your app:";

          // 2. Call the onCodeGenerated callback to update parent state
          onCodeGenerated?.(lastAiMessageWithCode.code, dependencies);
        } else {
          console.log('No code found in session:', sessionId);
        }

        // Notify parent component of session change
        onSessionCreated?.(sessionId);
      } catch (error) {
        console.error('Error loading session:', error);
      }
    },
    [database, chatState, onCodeGenerated, onSessionCreated]
  );

  // Handle the "New Chat" button click
  const handleNewChatButtonClick = useCallback(() => {
    // Start the shrinking animation
    setIsShrinking(true);
    setIsExpanding(false);

    // After animation completes, reset the state
    setTimeout(
      () => {
        // If onNewChat callback is provided, call it
        if (onNewChat) {
          onNewChat();
        }

        // Clear the UI without clearing saved messages yet
        setInput('');

        // Navigate to the root path
        window.history.pushState({ sessionId: null }, '', '/');

        // Reset animation states
        setIsShrinking(false);

        // Add a small bounce effect when the new chat appears
        setIsExpanding(true);
        setTimeout(() => {
          setIsExpanding(false);
        }, 300);

        // Clear messages once animation is complete and navigation happened
        setTimeout(() => {
          setMessages([]);
        }, 100);
      },
      500 + messages.length * 50
    );
  }, [onNewChat, messages.length, setInput, setMessages, setIsShrinking, setIsExpanding]);

  const handleSelectSession = (session: SessionDocument) => {
    // Navigate to the session route
    const encodedTitle = encodeTitle(session.title || 'Untitled Session');
    const url = `/session/${session._id}/${encodedTitle}`;

    // Use window.location.href to force a full page reload to the new URL
    window.location.href = url;

    // No need to call onSessionCreated since the page will reload
    // and the Session component will handle initializing with the new sessionId
  };

  // This function will be called when a new session is created
  const handleSessionCreated = (newSessionId: string) => {
    // If there's a provided callback, call it
    if (onSessionCreated) {
      onSessionCreated(newSessionId);
    }

    // Navigate to the new session without reloading by pushing to history state
    // This allows for a seamless experience when creating a new session during streaming
    const url = `/session/${newSessionId}/new-session`;
    window.history.pushState({ sessionId: newSessionId }, '', url);
  };

  // Memoize child components to prevent unnecessary re-renders
  const chatHeader = useMemo(
    () => (
      <ChatHeader
        onOpenSidebar={chatContext.openSidebar}
        onNewChat={handleNewChatButtonClick}
        isGenerating={isGenerating}
      />
    ),
    [chatContext.openSidebar, handleNewChatButtonClick, isGenerating]
  );

  const sessionSidebar = useMemo(
    () => (
      <SessionSidebar
        isVisible={chatContext.isSidebarVisible}
        onClose={chatContext.closeSidebar}
        onSelectSession={handleSelectSession}
      />
    ),
    [chatContext.isSidebarVisible, chatContext.closeSidebar, handleSelectSession]
  );

  const messageList = useMemo(
    () => (
      <MessageList
        messages={messages}
        isGenerating={isGenerating}
        currentStreamedText={currentStreamedText}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    ),
    [messages, isGenerating, currentStreamedText, isShrinking, isExpanding]
  );

  const quickSuggestions = useMemo(
    () => messages.length === 0 && <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />,
    [messages.length, handleSelectSuggestion]
  );

  // Memoize ChatInput with direct props instead of relying on context
  const chatInput = useMemo(() => {
    return (
      <ChatInput
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
        }}
        onSend={sendMessage}
        disabled={isGenerating}
        inputRef={inputRef}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
            e.preventDefault();
            sendMessage();
          }
        }}
      />
    );
  }, [input, isGenerating, setInput, sendMessage, inputRef]);

  // Keep isGenerating in sync with context
  useEffect(() => {
    if (chatState.isGenerating !== chatContext.isGenerating) {
      chatContext.setIsGenerating(chatState.isGenerating);
    }
  }, [chatContext, chatState.isGenerating]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {chatHeader}
      <SessionSidebar
        isVisible={chatContext.isSidebarVisible}
        onClose={chatContext.closeSidebar}
        onSelectSession={handleSelectSession}
      />

      <div className="relative flex flex-col overflow-y-auto" style={{ flexGrow: 1 }}>
        {/* Message list */}
        {messageList}

        {/* Quick access buttons */}
        {quickSuggestions}

        {/* Chat input */}
        {chatInput}
      </div>
    </div>
  );
}

export default ChatInterface;
