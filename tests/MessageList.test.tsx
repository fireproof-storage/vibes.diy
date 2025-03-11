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
          { type: 'ai', text: 'Hi there!', segments: [{ type: 'markdown', content: 'Hi there!' }] }
        ],
        isLoading: false
      };
    } else if (sessionId === 'empty-session') {
      return {
        messages: [],
        isLoading: false
      };
    } else {
      return {
        messages: [],
        isLoading: true
      };
    }
  })
}));

// Mock scrollIntoView
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('MessageList', () => {
  test('renders messages correctly', () => {
    render(
      <MessageList
        sessionId="test-session"
        isGenerating={false}
      />
    );

    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there!')).toBeDefined();
  });

  test('renders empty state correctly', () => {
    render(
      <MessageList
        sessionId="empty-session"
        isGenerating={false}
      />
    );

    expect(screen.getByText(/Quickly create React apps/)).toBeDefined();
  });

  test('renders streaming message correctly', () => {
    render(
      <MessageList
        sessionId="empty-session"
        isGenerating={true}
      />
    );

    expect(screen.getByText('Thinking')).toBeDefined();
  });

  test('renders loading state correctly', () => {
    render(
      <MessageList
        sessionId="loading-session"
        isGenerating={false}
      />
    );

    expect(screen.getByText('Loading messages...')).toBeDefined();
  });
});
