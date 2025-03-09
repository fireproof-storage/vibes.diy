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
  openSidebar: () => void;
  closeSidebar: () => void;

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
  onSendMessage = () => {},
  onNewChat = () => {},
}: ChatProviderProps) {
  // Core state with optional initial values
  const [input, setInput] = useState(initialState.input || '');
  const [isGenerating, setIsGenerating] = useState(initialState.isGenerating || false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(initialState.isSidebarVisible || false);

  // Sidebar visibility functions
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Start a new chat
  const handleNewChat = useCallback(() => {
    setInput('');
    setIsGenerating(false);

    // Call the external handler (guaranteed to exist with default)
    onNewChat();
  }, [onNewChat]);

  // Send message handler
  const handleSendMessage = useCallback(() => {
    if (!input.trim() || isGenerating) return;

    // Set generating state
    setIsGenerating(true);

    // Call external handler (guaranteed to exist with default)
    onSendMessage(input);

    // Clear input
    setInput('');
  }, [input, isGenerating, onSendMessage]);

  // Context value
  const contextValue: ChatContextState = {
    input,
    setInput,
    isGenerating,
    setIsGenerating,
    isSidebarVisible,
    openSidebar,
    closeSidebar,
    handleSendMessage,
    handleNewChat,
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

// Hook to use the chat context
export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error(
      'useChatContext must be used within a ChatProvider. Ensure this component is a child of ChatProvider.'
    );
  }
  return context;
}
