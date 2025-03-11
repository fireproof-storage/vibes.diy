import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { ChatMessage, SessionDocument, UserChatMessage, AiChatMessage, Segment } from './types/chat';
import { useFireproof } from 'use-fireproof';
import SessionSidebar from './components/SessionSidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import QuickSuggestions from './components/QuickSuggestions';
import { useChatContext } from './context/ChatContext';
import { Sandpack } from '@codesandbox/sandpack-react';

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
    getCurrentCode: () => string;
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

  // Maintain a stable ref to the database to prevent re-renders
  const databaseRef = useRef(database);

  // Update database ref when it changes
  useEffect(() => {
    databaseRef.current = database;
  }, [database]);

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
    getCurrentCode,
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

  // Load session data when sessionId changes
  useEffect(() => {
    async function loadSessionData() {
      if (sessionId) {
        try {
          const sessionData = (await databaseRef.current.get(sessionId)) as SessionDocument;
          // Normalize session data to guarantee messages array exists
          const messages = Array.isArray(sessionData.messages) ? sessionData.messages : [];
          // Use the ref to access the latest setMessages function
          setMessagesRef.current(messages);
        } catch (error) {
          console.error('ChatInterface: Error loading session:', error);
        }
      }
    }

    // Only load session data if we have a sessionId and it's not already loading
    const loadingTimeoutId = setTimeout(() => {
      loadSessionData();
    }, 0);

    return () => {
      clearTimeout(loadingTimeoutId);
    };
  }, [sessionId, databaseRef]); // Keep only essential dependencies

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

          const result = await databaseRef.current.put(sessionData);

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
  }, [isGenerating, sessionId]); // Minimize dependencies

  // Load a session from the sidebar
  const handleLoadSession = useCallback(
    async (session: SessionDocument) => {
      // Ensure session has an _id - this is guaranteed by the component API
      const sessionId = session._id;

      try {
        const sessionData = (await databaseRef.current.get(sessionId)) as SessionDocument;
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
          // No code found in session
        }

        // Notify parent component of session change
        onSessionCreated?.(sessionId);
      } catch (error) {
        console.error('ChatInterface.handleLoadSession: Error loading session:', error);
      }
    },
    [databaseRef, chatState, onCodeGenerated, onSessionCreated]
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
        // window.history.pushState({ sessionId: null }, '', '/');
        window.location.href = '/';

        // // Reset animation states
        // setIsShrinking(false);

        // // Add a small bounce effect when the new chat appears
        // setIsExpanding(true);
        // setTimeout(() => {
        //   setIsExpanding(false);
        // }, 300);

        // // Clear messages once animation is complete and navigation happened
        // setTimeout(() => {
        //   setMessages([]);
        // }, 100);
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
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    ),
    [messages, isGenerating, isShrinking, isExpanding]
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

  // Sandpack editor with current code
  const sandpack = useMemo(() => {
    return (
      <Sandpack
        customSetup={{
          dependencies: chatContext?.dependencies || {}, // Get from context if available
        }}
        theme={chatContext?.theme || 'dark'} // Get theme from context
        options={{
          showNavigator: true,
          showTabs: true,
          showConsole: true,
          showConsoleButton: true,
          closableTabs: false,
          visibleFiles: ['/App.jsx'],
        }}
        files={{
          '/App.jsx': {
            code: getCurrentCode() || '// Code will appear here after generation',
            active: true,
          },
        }}
        template="react"
      />
    );
  }, [chatContext, getCurrentCode]);

  // Function to handle session load or creation
  const loadOrCreateSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = (await databaseRef.current.get(sessionId)) as SessionDocument;
        
        if (session && session.messages) {
          // Convert any old message format to new format if needed
          const convertedMessages = session.messages.map((msg): ChatMessage => {
            if (msg.type === 'user') {
              return {
                type: 'user',
                text: msg.text,
                timestamp: msg.timestamp || Date.now()
              };
            } else {
              // For AI messages, we need to parse the text into segments
              const text = msg.text || '';
              // Use the parseContent function from our hook to parse the segments
              // This is just a re-implementation of that function for migration purposes
              const segments: Segment[] = [];
              
              // Check if it contains code
              if ('code' in msg && msg.code) {
                // Add text as markdown segment
                segments.push({
                  type: 'markdown',
                  content: text
                });
                
                // Add code segment
                segments.push({
                  type: 'code',
                  content: msg.code
                });
              } else {
                // Just add text as markdown
                segments.push({
                  type: 'markdown',
                  content: text
                });
              }
              
              return {
                type: 'ai',
                text: text,
                segments: segments,
                timestamp: msg.timestamp || Date.now(),
                // Convert dependencies to dependenciesString if present
                dependenciesString: 'dependencies' in msg && msg.dependencies ? 
                  JSON.stringify(msg.dependencies) : undefined
              };
            }
          });
          
          // Set the converted messages
          setMessages(convertedMessages);
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    },
    [setMessages]
  );

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

        {/* Sandpack editor with current code */}
        {sandpack}
      </div>
    </div>
  );
}

export default ChatInterface;
