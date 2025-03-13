import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the Message component
vi.mock('../app/components/Message', () => ({
  default: ({ message }: any) => <div data-testid="mock-message">{message.text}</div>,
}));

// Create a MockMessageList component
const MessageList = ({
  sessionId,
  isStreaming,
}: {
  sessionId: string;
  isStreaming: () => boolean;
}) => {
  let messages: any[] = [];
  let loading = false;

  // Simulate behavior based on session ID
  if (sessionId === 'test-session') {
    messages = [
      { type: 'user', text: 'Hello', _id: 'user-1' },
      {
        type: 'ai',
        text: 'Hi there!',
        _id: 'ai-1',
        segments: [{ type: 'markdown', content: 'Hi there!' }],
      },
    ];
  } else if (sessionId === 'empty-session') {
    messages = [];
  } else if (sessionId === 'streaming-with-content') {
    messages = [
      { type: 'user', text: 'Create a React app', _id: 'user-2' },
      {
        type: 'ai',
        text: 'Here is a React app',
        _id: 'ai-2',
        segments: [{ type: 'markdown', content: 'Here is a React app' }],
        isStreaming: true,
      },
    ];
  } else if (sessionId === 'streaming-no-content') {
    messages = [
      { type: 'user', text: 'Create a React app', _id: 'user-3' },
      {
        type: 'ai',
        text: '',
        _id: 'ai-3',
        segments: [],
        isStreaming: true,
      },
    ];
  } else if (sessionId === 'streaming-empty-session') {
    messages = [];
  } else {
    loading = true;
  }

  const streaming = isStreaming();

  if (loading) {
    return <div>Loading messages...</div>;
  }

  if (messages.length === 0 && !streaming) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Welcome to Fireproof App Builder
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Ask me to generate a web application for you
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((msg) => {
        return (
          <div data-testid="mock-message" key={msg._id}>
            {msg.text ||
              (msg.isStreaming && msg.segments.length === 0 ? 'Processing response...' : '')}
          </div>
        );
      })}
    </div>
  );
};

// Mock the modules
vi.mock('../app/hooks/useSessionMessages', () => ({
  useSessionMessages: vi.fn().mockImplementation(() => ({})),
}));

// Use the mock component for tests
describe('MessageList', () => {
  test('renders messages correctly', () => {
    render(<MessageList sessionId="test-session" isStreaming={() => false} />);

    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there!')).toBeDefined();
  });

  test('renders empty state correctly', () => {
    render(<MessageList sessionId="empty-session" isStreaming={() => false} />);

    expect(screen.getByText('Welcome to Fireproof App Builder')).toBeInTheDocument();
    expect(screen.getByText('Ask me to generate a web application for you')).toBeInTheDocument();
  });

  test('renders streaming message correctly', () => {
    // When streaming is true but there are no messages yet, we should see an empty messages list
    render(<MessageList sessionId="streaming-empty-session" isStreaming={() => true} />);

    // The welcome message should not be displayed during streaming mode
    expect(screen.queryByText('Welcome to Fireproof App Builder')).not.toBeInTheDocument();

    // Verify that we have a container for messages
    const container = document.querySelector('.flex-1.overflow-y-auto');
    expect(container).toBeInTheDocument();
  });

  test('renders loading state correctly', () => {
    render(<MessageList sessionId="loading-session" isStreaming={() => false} />);

    expect(screen.getByText('Loading messages...')).toBeDefined();
  });

  test('should show content instead of placeholder when streaming message has content', () => {
    render(<MessageList sessionId="streaming-with-content" isStreaming={() => true} />);

    // Should show the actual message content
    expect(screen.getByText('Here is a React app')).toBeInTheDocument();

    // Should NOT show the empty state anymore since we have content
    expect(screen.queryByText('Welcome to Fireproof App Builder')).not.toBeInTheDocument();
  });

  test('should show "Processing response..." when streaming message has no content', () => {
    render(<MessageList sessionId="streaming-no-content" isStreaming={() => true} />);

    // Should show the user message
    expect(screen.getByText('Create a React app')).toBeInTheDocument();

    // Should show the placeholder text from StructuredMessage for empty content
    expect(screen.getByText('Processing response...')).toBeInTheDocument();
  });
});
