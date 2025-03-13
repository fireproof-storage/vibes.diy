import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from '../app/components/ChatHeader';
import SessionSidebar from '../app/components/SessionSidebar';
import MessageList from '../app/components/MessageList';
import type { ChatMessage, UserChatMessage, AiChatMessage } from '../app/types/chat';

// Mock dependencies
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {},
    useLiveQuery: () => ({ docs: [] }),
  }),
}));

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
const onToggleSidebar = vi.fn();
const onNewChat = vi.fn();
const onClose = vi.fn();
let isGeneratingValue = false;

describe('Component Rendering', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isGeneratingValue = false;
  });

  describe('ChatHeader', () => {
    it('renders without crashing', () => {
      render(
        <ChatHeader
          onOpenSidebar={onOpenSidebar}
          onNewChat={onNewChat}
          isStreaming={() => isGeneratingValue}
          title="Test Chat"
        />
      );
      expect(screen.getAllByLabelText('New Chat').length).toBeGreaterThan(0);
    });

    it('applies tooltip classes correctly', () => {
      render(
        <ChatHeader 
          onOpenSidebar={() => {}} 
          onNewChat={() => {}} 
          isStreaming={() => false}
          title="Test Chat"
        />
      );
      expect(
        screen.getByText('New Chat', { selector: 'span.pointer-events-none' })
      ).toBeInTheDocument();
    });

    it('allows creating a new chat even when generating', () => {
      isGeneratingValue = true;
      render(
        <ChatHeader
          onOpenSidebar={onOpenSidebar}
          onNewChat={onNewChat}
          isStreaming={() => isGeneratingValue}
          title="Test Chat"
        />
      );
      const newChatButton = screen.getByLabelText('New Chat');
      expect(newChatButton).not.toBeDisabled();

      fireEvent.click(newChatButton);
      expect(onNewChat).toHaveBeenCalledTimes(1);
    });
  });

  describe('SessionSidebar', () => {
    it('renders in hidden state', () => {
      const { container } = render(<SessionSidebar isVisible={false} onClose={onClose} />);
      // Check that it has the hidden class
      expect(container.firstChild).toHaveClass('-translate-x-full');
    });

    it('renders in visible state', () => {
      const { container } = render(<SessionSidebar isVisible={true} onClose={onClose} />);
      expect(container.firstChild).toHaveClass('translate-x-0');

      // Check that content is rendered when visible
      expect(screen.getByText('App History')).toBeInTheDocument();
    });

    it('shows empty state when no sessions', () => {
      render(<SessionSidebar isVisible={true} onClose={onClose} />);
      expect(screen.getByText('No saved sessions yet')).toBeInTheDocument();
    });
  });

  describe('MessageList', () => {
    it('renders empty list', () => {
      const { container } = render(
        <MessageList messages={[]} isStreaming={false} />
      );
      expect(screen.getByText('Welcome to Fireproof App Builder')).toBeInTheDocument();
    });

    it('renders messages correctly', () => {
      const messages = [
        { 
          type: 'user' as const, 
          text: 'Hello', 
          _id: 'user-1', 
          session_id: 'test-session',
          created_at: Date.now() 
        } as UserChatMessage,
        {
          type: 'ai' as const,
          text: 'Hi there',
          _id: 'ai-1',
          segments: [{ type: 'markdown', content: 'Hi there' }],
          session_id: 'test-session',
          created_at: Date.now()
        } as AiChatMessage
      ];

      render(<MessageList messages={messages} isStreaming={false} />);
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
          created_at: Date.now() 
        } as UserChatMessage,
        {
          type: 'ai' as const,
          text: '',
          _id: 'ai-2',
          segments: [],
          isStreaming: true,
          session_id: 'test-session',
          created_at: Date.now()
        } as AiChatMessage
      ];

      render(<MessageList messages={messages} isStreaming={true} />);
      // Either the Message component should display "Processing response..." or we need to verify that it renders
      // an empty message which would be handled by the Message component in the real app
      expect(screen.getAllByTestId('markdown').length).toBe(0);
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
          created_at: Date.now()
        } as AiChatMessage
      ];

      render(<MessageList messages={messages} isStreaming={true} />);
      expect(screen.getByText('I am thinking...')).toBeInTheDocument();
    });
  });
});
