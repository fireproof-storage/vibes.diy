import { render, screen } from '@testing-library/react';
import MessageList from '../app/components/MessageList';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the useSessionMessages hook
vi.mock('../app/hooks/useSessionMessages', () => ({
  useSessionMessages: vi.fn().mockImplementation((sessionId) => {
    if (sessionId === 'test-session') {
      return {
        messages: [
          { type: 'user', text: 'Hello' },
          { type: 'ai', text: 'Hi there!', segments: [{ type: 'markdown', content: 'Hi there!' }] },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'empty-session') {
      return {
        messages: [],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-with-content') {
      // Simulate a streaming message with actual content
      return {
        messages: [
          { type: 'user', text: 'Create a React app' },
          {
            type: 'ai',
            text: 'Here is a React app',
            segments: [{ type: 'markdown', content: 'Here is a React app' }],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-no-content') {
      // Simulate a streaming message with no content yet
      return {
        messages: [
          { type: 'user', text: 'Create a React app' },
          {
            type: 'ai',
            text: '',
            segments: [],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-empty-session') {
      // Simulate a streaming session with no messages yet
      return {
        messages: [],
        isLoading: false,
      };
    } else {
      return {
        messages: [],
        isLoading: true,
      };
    }
  }),
}));

// Mock scrollIntoView
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

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
