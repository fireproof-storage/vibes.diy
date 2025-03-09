import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../app/routes/home';
import { useChatContext } from '../app/context/ChatContext';

// Mock dependencies
vi.mock('../app/hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    setMessages: vi.fn(),
    input: '',
    setInput: vi.fn(),
    isGenerating: false,
    currentStreamedText: '',
    streamingCode: '',
    completedCode: '',
    isStreaming: false,
    inputRef: { current: null },
    messagesEndRef: { current: null },
    autoResizeTextarea: vi.fn(),
    scrollToBottom: vi.fn(),
    sendMessage: vi.fn(),
    parserState: { current: { dependencies: {} } },
    completedMessage: '',
  }),
}));

vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {
      put: vi.fn().mockResolvedValue({ ok: true }),
    },
  }),
}));

// Mock our ChatInterface to detect context errors
vi.mock('../app/ChatInterface', () => {
  // Import the actual component to detect errors
  const actualComponent = vi.importActual('../app/ChatInterface');

  return {
    __esModule: true,
    default: (props: any) => {
      try {
        // This should throw if ChatProvider is missing
        useChatContext();
        return <div data-testid="chat-interface">Chat Interface</div>;
      } catch (error) {
        // Capture the error for our test to verify
        return <div data-testid="context-error">{String(error)}</div>;
      }
    },
  };
});

describe('Home Route', () => {
  it('should properly provide ChatContext to child components', () => {
    // Render the home component
    render(<Home />);

    // If the context is missing, we'll see the error message
    const contextError = screen.queryByTestId('context-error');

    // This test should initially fail, showing that ChatContext is missing
    expect(contextError).toBeNull();
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
  });
});
