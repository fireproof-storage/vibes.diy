import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatInterface from '../app/components/ChatInterface';

// Mock the child components
vi.mock('../app/components/ChatHeader', () => ({
  default: () => <div data-testid="chat-header">Header</div>
}));

vi.mock('../app/components/ChatInput', () => ({
  default: () => <div data-testid="chat-input">Input</div>
}));

// Mock the context provider
const mockChatProvider = vi.fn(({ children }) => (
  <div data-testid="chat-provider">{children}</div>
));

vi.mock('../app/context/ChatContext', () => ({
  ChatProvider: (props: any) => mockChatProvider(props),
  useChatContext: vi.fn()
}));

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with all components', () => {
    render(<ChatInterface />);
    
    expect(screen.getByTestId('chat-provider')).toBeDefined();
    expect(screen.getByTestId('chat-header')).toBeDefined();
    expect(screen.getByTestId('chat-input')).toBeDefined();
    expect(screen.getByText('No messages yet. Start a conversation!')).toBeDefined();
  });
  
  it('passes props to ChatProvider', () => {
    const onSendMessage = vi.fn();
    const onNewChat = vi.fn();
    const initialState = { 
      input: 'test',
      isGenerating: true,
      isSidebarVisible: true
    };
    
    render(
      <ChatInterface 
        onSendMessage={onSendMessage}
        onNewChat={onNewChat}
        initialState={initialState}
      />
    );
    
    // Verify the provider was called with the correct props
    expect(mockChatProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState,
        onSendMessage: expect.any(Function),
        onNewChat: expect.any(Function),
        children: expect.anything()
      })
    );
  });
}); 