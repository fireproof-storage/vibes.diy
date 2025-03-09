import { useRef, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import { ChatProvider } from '../context/ChatContext';

interface ChatInterfaceProps {
  onSendMessage?: (input: string) => void;
  onNewChat?: () => void;
  initialState?: {
    input?: string;
    isGenerating?: boolean;
    isSidebarVisible?: boolean;
  };
}

// Content component inside the provider
function ChatContent() {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  
  return (
    <div className="flex h-screen flex-col">
      <ChatHeader />
      
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {/* Chat messages would go here */}
        <div className="flex justify-center items-center h-full text-light-primary dark:text-dark-primary opacity-50">
          No messages yet. Start a conversation!
        </div>
      </div>
      
      <ChatInput />
    </div>
  );
}

// Main component that wraps the content with the provider
function ChatInterface({ 
  onSendMessage, 
  onNewChat,
  initialState = {}
}: ChatInterfaceProps = {}) {
  const handleSendMessage = useCallback((input: string) => {
    if (onSendMessage) {
      onSendMessage(input);
    }
  }, [onSendMessage]);

  const handleNewChat = useCallback(() => {
    if (onNewChat) {
      onNewChat();
    }
  }, [onNewChat]);

  return (
    <ChatProvider 
      initialState={initialState}
      onSendMessage={handleSendMessage}
      onNewChat={handleNewChat}
    >
      <ChatContent />
    </ChatProvider>
  );
}

export default ChatInterface; 