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
    render(<MessageList sessionId="empty-session" isStreaming={() => true} />);

    expect(screen.getByText('Thinking')).toBeDefined();
  });

  test('renders loading state correctly', () => {
    render(<MessageList sessionId="loading-session" isStreaming={() => false} />);

    expect(screen.getByText('Loading messages...')).toBeDefined();
  });

  test('should show content instead of "Thinking" when streaming message has content', () => {
    render(<MessageList sessionId="streaming-with-content" isStreaming={() => true} />);

    // Should show the actual message content
    expect(screen.getByText('Here is a React app')).toBeInTheDocument();

    // Should NOT show "Thinking..." when there's content
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
  });

  test('should only show "Thinking" when streaming message has no content', () => {
    render(<MessageList sessionId="streaming-no-content" isStreaming={() => true} />);

    // Should show "Thinking..." when there's no content
    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });
});
