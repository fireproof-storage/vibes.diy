import { useEffect, useMemo, useRef } from 'react';
import type { ChatInterfaceProps } from '../types/chat'; // Updated import
import MessageList from './MessageList';
import WelcomeScreen from './WelcomeScreen';

// Removed local ChatInterfaceProps definition

function ChatInterface({
  docs: messages,
  isStreaming,
  selectedResponseDoc,
  setSelectedResponseId,
  setMobilePreviewShown,
  // setActiveView, // Removed
  navigateToView, // Added
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
        // setActiveView={setActiveView} // Removed
        navigateToView={navigateToView} // Added
      />
    );
  }, [
    messages,
    isStreaming,
    setSelectedResponseId,
    selectedResponseDoc,
    setMobilePreviewShown,
    // setActiveView, // Removed
    navigateToView, // Added
  ]);

  return (
    <div className="flex h-full flex-col">
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
