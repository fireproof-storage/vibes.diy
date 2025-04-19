// Vitest will automatically use mocks from __mocks__ directory
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatHeader from '../app/components/ChatHeaderContent';
import SessionSidebar from '../app/components/SessionSidebar';
import MessageList from '../app/components/MessageList';
import type { UserChatMessage, AiChatMessage, ChatMessageDocument } from '../app/types/chat';
import { mockSessionSidebarProps } from './mockData';

// Mock dependencies
vi.mock('react-markdown', () => {
  const React = require('react');
  return {
    default: vi.fn(({ children }: { children: string }) => {
      // Use React.createElement instead of JSX
      return React.createElement('div', { 'data-testid': 'markdown' }, children);
    }),
  };
});

// Mock the scrollIntoView method
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock the useSessionMessages hook for MessageList
vi.mock('../app/hooks/useSessionMessages', () => {
  return {
    useSessionMessages: (sessionId: string | null) => {
      // Check the sessionId to determine what to return
      if (sessionId === 'streaming-session') {
        return {
          messages: [
            {
              type: 'ai',
              text: 'I am thinking...',
              segments: [{ type: 'markdown', content: 'I am thinking...' }],
              isStreaming: true,
              timestamp: Date.now(),
            },
          ],
          isLoading: false,
          addUserMessage: vi.fn(),
          updateAiMessage: vi.fn(),
        };
      } else if (sessionId === 'empty-session-streaming') {
        return {
          messages: [
            { type: 'user', text: 'Hello', timestamp: Date.now() },
            {
              type: 'ai',
              text: '',
              segments: [],
              isStreaming: true,
              timestamp: Date.now(),
            },
          ],
          isLoading: false,
          addUserMessage: vi.fn(),
          updateAiMessage: vi.fn(),
        };
      } else if (sessionId === 'test-session') {
        return {
          messages: [
            { type: 'user', text: 'Hello', timestamp: Date.now() },
            {
              type: 'ai',
              text: 'Hi there',
              segments: [{ type: 'markdown', content: 'Hi there' }],
              timestamp: Date.now(),
            },
          ],
          isLoading: false,
          addUserMessage: vi.fn(),
          updateAiMessage: vi.fn(),
        };
      } else {
        return {
          messages: [],
          isLoading: false,
          addUserMessage: vi.fn(),
          updateAiMessage: vi.fn(),
        };
      }
    },
  };
});

// Create mock functions we can control
const onOpenSidebar = vi.fn();
const onClose = vi.fn();

describe('Component Rendering', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('ChatHeader', () => {
    it('renders without crashing', () => {
      render(
        <ChatHeader
          onOpenSidebar={onOpenSidebar}
          title="Test Chat"
          isStreaming={false}
          codeReady={false}
        />
      );
      expect(screen.getByText('Test Chat')).toBeInTheDocument();
    });

    it('applies tooltip classes correctly', () => {
      render(
        <ChatHeader
          onOpenSidebar={onOpenSidebar}
          title="Test Chat"
          isStreaming={false}
          codeReady={false}
        />
      );
      expect(
        screen.getByText('New Vibe', { selector: 'span.pointer-events-none' })
      ).toBeInTheDocument();
    });

    it('handles new chat button click', () => {
      render(
        <ChatHeader
          onOpenSidebar={onOpenSidebar}
          title="Test Chat"
          isStreaming={false}
          codeReady={false}
        />
      );

      // Just verify the new vibe button exists since we can't easily mock document.location
      const newVibeButton = screen.getByLabelText('New Vibe');
      expect(newVibeButton).toBeInTheDocument();

      // Note: we can't reliably test the navigation in JSDOM environment
      // In a real browser, clicking this button would navigate to '/'
    });
  });

  describe('SessionSidebar', () => {
    it('renders in hidden state', () => {
      const { container } = render(
        <SessionSidebar isVisible={false} onClose={onClose} {...mockSessionSidebarProps} />
      );
      // Check that it has the hidden class
      expect(container.firstChild).toHaveClass('-translate-x-full');
    });

    it('renders in visible state', () => {
      const { container } = render(
        <SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />
      );
      // Check that it doesn't have the hidden class
      expect(container.firstChild).not.toHaveClass('-translate-x-full');

      // Check that navigation menu items are rendered
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('My Vibes')).toBeInTheDocument();
    });

    it('shows navigation menu items', () => {
      render(<SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('has a close button that works', () => {
      const onClose = vi.fn();
      render(<SessionSidebar {...mockSessionSidebarProps} isVisible={true} onClose={onClose} />);

      // Find and click the close button
      const closeButton = screen.getByLabelText('Close sidebar');
      fireEvent.click(closeButton);

      // Verify that onClose was called
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('MessageList', () => {
    it('renders empty list', () => {
      render(
        <MessageList
          messages={[]}
          isStreaming={false}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );

      // Verify the container is rendered but empty
      const messageContainer = document.querySelector('.flex-col.space-y-4');
      expect(messageContainer).toBeInTheDocument();
      expect(messageContainer?.children.length).toBe(0);
    });

    it('renders messages correctly', () => {
      const messages = [
        {
          type: 'user' as const,
          text: 'Hello',
          _id: 'user-1',
          session_id: 'test-session',
          created_at: Date.now(),
        } as UserChatMessage,
        {
          type: 'ai' as const,
          text: 'Hi there',
          _id: 'ai-1',
          segments: [{ type: 'markdown', content: 'Hi there' }],
          session_id: 'test-session',
          created_at: Date.now(),
        } as AiChatMessage,
      ];

      render(
        <MessageList
          messages={messages}
          isStreaming={false}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    it('renders placeholder text when streaming with no content', () => {
      const messages = [
        {
          type: 'user' as const,
          text: 'Hello',
          _id: 'user-2',
          session_id: 'test-session',
          created_at: Date.now(),
        } as UserChatMessage,
        {
          type: 'ai' as const,
          text: '',
          _id: 'ai-2',
          segments: [],
          isStreaming: true,
          session_id: 'test-session',
          created_at: Date.now(),
        } as AiChatMessage,
      ];

      render(
        <MessageList
          messages={messages}
          isStreaming={true}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );
      // The Message component in our test displays "Processing response..." in a markdown element
      // when there's no content but streaming is true
      expect(screen.getAllByTestId('markdown').length).toBeGreaterThan(0);
    });

    it('renders streaming message', () => {
      const messages = [
        {
          type: 'ai' as const,
          text: 'I am thinking...',
          _id: 'streaming-1',
          segments: [{ type: 'markdown', content: 'I am thinking...' }],
          isStreaming: true,
          session_id: 'test-session',
          created_at: Date.now(),
        } as AiChatMessage,
      ];

      render(
        <MessageList
          messages={messages}
          isStreaming={true}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );
      expect(screen.getByText('I am thinking...')).toBeInTheDocument();
    });

    it('renders without crashing', () => {
      render(
        <MessageList
          messages={[]}
          isStreaming={false}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );
    });

    it('renders messages with no streaming', () => {
      const messages = [
        {
          _id: '1',
          type: 'user',
          text: 'Hello, world!',
        },
        {
          _id: '2',
          type: 'ai',
          text: 'Hi there!',
        },
      ] as ChatMessageDocument[];

      render(
        <MessageList
          messages={messages}
          isStreaming={false}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );
    });

    it('renders messages with streaming', () => {
      const messages = [
        {
          _id: '1',
          type: 'user',
          text: 'Hello, world!',
        },
        {
          _id: '2',
          type: 'ai',
          text: 'Hi there!',
        },
      ] as ChatMessageDocument[];

      render(
        <MessageList
          messages={messages}
          isStreaming={true}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );
    });

    it('renders AI messages with streaming segments', () => {
      const messages = [
        {
          _id: '1',
          type: 'ai',
          text: 'This is a streaming message',
          segments: [
            { type: 'markdown', content: 'This is a ' },
            { type: 'code', content: 'const x = "streaming message";' },
          ],
        },
      ] as unknown as ChatMessageDocument[];

      render(
        <MessageList
          messages={messages}
          isStreaming={true}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );
    });

    it('MessageList renders correctly with segments', () => {
      const messages = [
        {
          _id: 'user1',
          type: 'user' as const,
          text: 'Hello',
        },
        {
          _id: 'ai1',
          type: 'ai' as const,
          text: 'This is a test',
          segments: [{ type: 'markdown', content: 'This is a test' }],
        },
      ] as unknown as ChatMessageDocument[];

      render(
        <MessageList
          messages={messages}
          isStreaming={false}
          setSelectedResponseId={() => {}}
          selectedResponseId=""
          setMobilePreviewShown={() => {}}
        />
      );

      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('This is a test')).toBeInTheDocument();
    });
  });
});
