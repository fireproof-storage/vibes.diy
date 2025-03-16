import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import type { ChatState } from '../types/chat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import QuickSuggestions from './QuickSuggestions';
import { WelcomeScreen } from './Message';

interface ChatInterfaceProps extends ChatState {
  setMobilePreviewShown: (shown: boolean) => void;
}

function ChatInterface({
  docs: messages,
  isStreaming,
  selectedResponseDoc,
  setSelectedResponseId,
  setMobilePreviewShown,
}: ChatInterfaceProps) {
  // State for UI transitions and sharing
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when message count changes or when streaming starts/stops
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      try {
        // Since we're using flex-col-reverse, we need to scroll to the top to see the latest messages
        messagesContainerRef.current.scrollTop = 0;
      } catch (error) {
        console.error('Error scrolling to bottom:', error);
      }
    }
  }, [messages.length, isStreaming]);

  // Memoize the MessageList component to prevent unnecessary re-renders
  const memoizedMessageList = useMemo(() => {
    return (
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        setSelectedResponseId={setSelectedResponseId}
        selectedResponseId={selectedResponseDoc?._id || ''}
        setMobilePreviewShown={setMobilePreviewShown}
      />
    );
  }, [messages, isStreaming, setSelectedResponseId, selectedResponseDoc, setMobilePreviewShown]);

  return (
    <div className="flex h-full flex-col overflow-scroll">
      {messages.length > 0 ? (
        <div ref={messagesContainerRef} className="flex flex-grow flex-col-reverse overflow-y-auto">
          {memoizedMessageList}
        </div>
      ) : (
        <div className="flex flex-grow flex-col justify-between">
          <div className="flex-grow pb-4">
            <WelcomeScreen />
          </div>
        </div>
      )}
    </div>
  );
}

// Export the component
export default ChatInterface;

// Also export a function to get just the chat input component
export function getChatInputComponent({
  input,
  setInput,
  sendMessage,
  isStreaming,
  inputRef,
}: Pick<ChatState, 'input' | 'setInput' | 'sendMessage' | 'isStreaming' | 'inputRef'>) {
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ChatInput
      value={input}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onSend={sendMessage}
      disabled={isStreaming}
      inputRef={inputRef}
    />
  );
}

// Export a function to get suggestions component
export function getSuggestionsComponent({
  setInput,
  inputRef,
}: Pick<ChatState, 'setInput' | 'inputRef'>) {
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

  return <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />;
}
