import { useState, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ChatState } from '../types/chat';
import SessionSidebar from './SessionSidebar';
import ChatHeaderContent from './ChatHeaderContent';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import QuickSuggestions from './QuickSuggestions';

function ChatInterface({
  docs: messages,
  input,
  setInput,
  isStreaming,
  inputRef,
  sendMessage,
  sessionId,
  title,
  registerSidebarOpener,
}: ChatState) {
  // State for UI transitions and sharing
  const [isShrinking, setIsShrinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  // Sidebar visibility functions
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Register the sidebar opener if function is provided
  if (registerSidebarOpener) {
    registerSidebarOpener(openSidebar);
  }

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

  // Support running in test environment
  const showHeaderInTest = process.env.NODE_ENV === 'test';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {showHeaderInTest && (
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 flex h-[4rem] items-center justify-between border-b px-6 py-4">
          <ChatHeaderContent onOpenSidebar={openSidebar} title={title || 'New Chat'} />
        </div>
      )}

      <div 
        className={`flex h-full flex-grow flex-col overflow-hidden transition-all duration-300 ${
          isShrinking ? 'w-0' : 'w-full'
        } ${isExpanding ? 'w-full' : ''}`}
      >
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
        <SessionSidebar
          isVisible={isSidebarVisible}
          onClose={closeSidebar}
          sessionId={sessionId || ''}
        />
      </div>
    </div>
  );
}

export default ChatInterface;
