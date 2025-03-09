import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// Define the core chat state and functionality
interface ChatContextState {
  // Core text state
  input: string;
  setInput: (input: string) => void;
  
  // Generation status
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  
  // UI state
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
  
  // Core functions
  handleSendMessage: () => void;
  handleNewChat: () => void;
}

// Create the context with undefined default
const ChatContext = createContext<ChatContextState | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
  initialState?: {
    input?: string;
    isGenerating?: boolean;
    isSidebarVisible?: boolean;
  };
  // These optional props allow parent components to override behavior
  onSendMessage?: (input: string) => void;
  onNewChat?: () => void;
}

// Provider component
export function ChatProvider({ 
  children, 
  initialState = {},
  onSendMessage,
  onNewChat
}: ChatProviderProps) {
  // Core state with optional initial values
  const [input, setInput] = useState(initialState.input || '');
  const [isGenerating, setIsGenerating] = useState(initialState.isGenerating || false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(initialState.isSidebarVisible || false);

  // Simple sidebar toggle
  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(prev => !prev);
  }, []);

  // Start a new chat
  const handleNewChat = useCallback(() => {
    setInput('');
    setIsGenerating(false);
    
    // Call the external handler if provided
    if (onNewChat) {
      onNewChat();
    }
  }, [onNewChat]);

  // Send message handler
  const handleSendMessage = useCallback(() => {
    if (!input.trim() || isGenerating) return;
    
    // Set generating state
    setIsGenerating(true);
    
    // Call external handler if provided
    if (onSendMessage) {
      onSendMessage(input);
    }
    
    // Clear input
    setInput('');
    
    // If no external handler, simulate response
    if (!onSendMessage) {
      // Simulate async behavior
      setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
    }
  }, [input, isGenerating, onSendMessage]);

  // Context value
  const contextValue: ChatContextState = {
    input,
    setInput,
    isGenerating,
    setIsGenerating,
    isSidebarVisible,
    toggleSidebar,
    handleSendMessage,
    handleNewChat
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook to use the chat context
export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
} 