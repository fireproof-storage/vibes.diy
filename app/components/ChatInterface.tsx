import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import type { ChatState } from '../types/chat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import QuickSuggestions from './QuickSuggestions';
import { WelcomeScreen } from './Message';

interface ChatInterfaceProps extends ChatState {
  renderChatInput?: boolean; // Flag to control whether chat input is rendered here
  renderSuggestions?: boolean; // Flag to control whether suggestions are rendered inside
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
  setSelectedResponseId,
  renderChatInput = true, // Default to true for backward compatibility
  renderSuggestions = true, // Default to true for backward compatibility
}: ChatInterfaceProps) {
  // State for UI transitions and sharing
  const [isShrinking] = useState(false);
  const [isExpanding] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
        isShrinking={isShrinking}
        isExpanding={isExpanding}
        setSelectedResponseId={handleSetSelectedResponseId}
      />
    );
  }, [messages, isStreaming, isShrinking, isExpanding, handleSetSelectedResponseId]);

  // Create the chat input component (used both in this component and passed to parent)
  const chatInputComponent = useMemo(
    () => (
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={sendMessage}
        disabled={isStreaming}
        inputRef={inputRef}
      />
    ),
    [input, handleInputChange, handleKeyDown, sendMessage, isStreaming, inputRef]
  );

  // Create suggestions component only if we should render it
  const suggestionsComponent = useMemo(() => {
    if (renderSuggestions && messages.length === 0) {
      return <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />;
    }
    return null;
  }, [renderSuggestions, messages.length, handleSelectSuggestion]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {messages.length > 0 ? (
        <div ref={messagesContainerRef} className="flex flex-grow flex-col-reverse overflow-y-auto">
          {memoizedMessageList}
        </div>
      ) : (
        <div className="flex flex-grow flex-col justify-between">
          <div className="flex-grow pb-4">
            <WelcomeScreen />
          </div>
          {/* Only render suggestions inside the component if explicitly requested */}
          {suggestionsComponent}
        </div>
      )}
      {/* Only render the chat input here if requested */}
      {renderChatInput && chatInputComponent}
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

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile using window.matchMedia
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);

    // Add listener for screen size changes
    const handleResize = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleResize);
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, []);

  return (
    <ChatInput
      value={input}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onSend={sendMessage}
      disabled={isStreaming}
      inputRef={inputRef}
      isMobile={isMobile}
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

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile using window.matchMedia
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);

    // Add listener for screen size changes
    const handleResize = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleResize);
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, []);

  return <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} isMobile={isMobile} />;
}
