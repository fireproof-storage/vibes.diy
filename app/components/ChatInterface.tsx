import { useState, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ChatState } from '../types/chat';
import SessionSidebar from './SessionSidebar';
import ChatHeader from './ChatHeader';
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
}: ChatState) {
  // State for UI transitions and sharing
  const [isShrinking, setIsShrinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  // Convert docs to messages
  // const messages = useMemo(() => convertDocsToMessages(docs), [docs]);

  // Sidebar visibility functions
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

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
  }, [sessionId, messages, isStreaming, isShrinking, isExpanding, handleSetSelectedResponseId]);

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
