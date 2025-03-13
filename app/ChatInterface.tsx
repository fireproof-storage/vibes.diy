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
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isStreaming: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    sendMessage: () => Promise<void>;

    title: string;
    sessionId?: string | null;
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

function ChatInterface({ chatState, onSessionCreated, onNewChat }: ChatInterfaceProps) {
  // Extract commonly used values from chatState to avoid repetition
  const { messages, input, setInput, isStreaming, inputRef, sendMessage, sessionId, title } =
    chatState;
  // State for UI transitions and sharing
  const [isShrinking, setIsShrinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Sidebar visibility functions
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Save session data when title changes
  // useEffect(() => {
  //   // Title is now managed by the useSession hook inside useSimpleChat
  //   // We no longer need to manually save it
  // }, []);

  // Create a new chat session
  // const handleNewChat = useCallback(() => {
  //   // First trigger animation
  //   setIsShrinking(true);
  //   // Then redirect to home page after animation
  //   setTimeout(() => {
  //     window.location.href = '/';
  //   }, 500);
  // }, []);

  // Compute current streaming message text
  // const currentStreamedText = useMemo(() => {
  //   const lastAiMessage = [...messages]
  //     .reverse()
  //     .find((msg): msg is AiChatMessage => msg.type === 'ai' && Boolean(msg.isStreaming));
  //   return lastAiMessage?.text || '';
  // }, [messages]);

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
      if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
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
    logDebug(
      `Creating MessageList with sessionId=${sessionId}, messages=${messages.length}, isStreaming=${isStreaming}`
    );

    return (
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    );
  }, [sessionId, messages, isStreaming, isShrinking, isExpanding]);

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader onOpenSidebar={openSidebar} title={title} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-1 flex-col">
          {memoizedMessageList}
          {messages.length === 0 && (
            <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />
          )}
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            disabled={isStreaming}
            inputRef={inputRef}
          />
        </div>
      </div>
      <SessionSidebar isVisible={isSidebarVisible} onClose={closeSidebar} />
    </div>
  );
}

export default ChatInterface;
