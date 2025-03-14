import { useState, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ChatState } from '../types/chat';
import SessionSidebar from './SessionSidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import QuickSuggestions from './QuickSuggestions';

interface ChatInterfaceProps extends ChatState {
  isSidebarVisible: boolean;
  setIsSidebarVisible: (isVisible: boolean) => void;
}

function ChatInterface({
  docs: messages,
  input,
  setInput,
  isStreaming,
  inputRef,
  sendMessage,
  sessionId,
  title,
  codeReady,
  addScreenshot,
  isSidebarVisible,
  setIsSidebarVisible,
}: ChatInterfaceProps) {
  // State for UI transitions and sharing
  const [isShrinking, setIsShrinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  // Sidebar visibility function
  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, [setIsSidebarVisible]);

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
    [setInput, inputRef]
  );

  // Callback for setting the selected response ID
  const handleSetSelectedResponseId = useCallback((id: string) => {
    setSelectedResponseId(id);
  }, []);

  // Memoize the MessageList component to prevent unnecessary re-renders
  const memoizedMessageList = useMemo(() => {
    return (
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
        setSelectedResponseId={handleSetSelectedResponseId}
      />
    );
  }, [messages, isStreaming, isShrinking, isExpanding, handleSetSelectedResponseId]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-light-background-01 dark:bg-dark-background-01">
      {messages.length > 0 ? (
        <div className="flex-grow overflow-y-auto flex flex-col-reverse">
          {memoizedMessageList}
        </div>
      ) : (
        <div className="flex flex-col justify-between flex-grow">
          <div className="flex-grow"></div>
          <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />
        </div>
      )}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={sendMessage}
        disabled={isStreaming}
        inputRef={inputRef}
      />
      <SessionSidebar 
        isVisible={isSidebarVisible} 
        onClose={closeSidebar} 
        sessionId={sessionId || ''} 
      />
    </div>
  );
}

export default ChatInterface;
