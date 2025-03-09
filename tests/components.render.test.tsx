import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatHeader from '../app/components/ChatHeader';
import SessionSidebar from '../app/components/SessionSidebar';
import MessageList from '../app/components/MessageList';
import type { ChatMessage } from '../app/types/chat';

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

// Mock the ChatContext for ChatHeader tests
const openSidebar = vi.fn();
const handleNewChat = vi.fn();
let isGeneratingValue = false;

vi.mock('../app/context/ChatContext', () => ({
  useChatContext: () => ({
    isGenerating: isGeneratingValue,
    openSidebar,
    closeSidebar: vi.fn(),
    handleNewChat,
  }),
}));

describe('Component Rendering', () => {
  describe('ChatHeader', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      isGeneratingValue = false;
    });

    it('renders without crashing', () => {
      render(<ChatHeader />);
      expect(screen.getByLabelText('New Chat')).toBeInTheDocument();
    });

    it('applies tooltip classes correctly', () => {
      const { container } = render(<ChatHeader />);

      // Check if the button has the peer class
      const button = screen.getByLabelText('New Chat');
      expect(button).toHaveClass('peer');

      // Check if the tooltip has correct classes
      const tooltip = container.querySelector('.absolute.top-full');
      expect(tooltip).toHaveClass('peer-hover:opacity-100');
    });

    it('disables new chat button when generating', () => {
      isGeneratingValue = true;
      render(<ChatHeader />);
      expect(screen.getByLabelText('New Chat')).toBeDisabled();
    });
  });

  describe('SessionSidebar', () => {
    it('renders in hidden state', () => {
      const onClose = vi.fn();
      const onSelectSession = vi.fn();
      const { container } = render(
        <SessionSidebar isVisible={false} onClose={onClose} onSelectSession={onSelectSession} />
      );
      // Check that it has the hidden class
      expect(container.firstChild).toHaveClass('-translate-x-full');
    });

    it('renders in visible state', () => {
      const onClose = vi.fn();
      const onSelectSession = vi.fn();
      const { container } = render(
        <SessionSidebar isVisible={true} onClose={onClose} onSelectSession={onSelectSession} />
      );
      expect(container.firstChild).toHaveClass('translate-x-0');

      // Check that content is rendered when visible
      expect(screen.getByText('App History')).toBeInTheDocument();
    });

    it('shows empty state when no sessions', () => {
      const onClose = vi.fn();
      const onSelectSession = vi.fn();
      render(
        <SessionSidebar isVisible={true} onClose={onClose} onSelectSession={onSelectSession} />
      );
      expect(screen.getByText('No saved sessions yet')).toBeInTheDocument();
    });
  });

  describe('MessageList', () => {
    it('renders empty list', () => {
      const { container } = render(
        <MessageList messages={[]} isGenerating={false} currentStreamedText="" />
      );
      expect(container.querySelector('.messages')).toBeInTheDocument();
    });

    it('renders messages correctly', () => {
      const messages: ChatMessage[] = [
        { text: 'Hello', type: 'user' },
        { text: 'Hi there', type: 'ai' },
      ];
      render(<MessageList messages={messages} isGenerating={false} currentStreamedText="" />);
      expect(screen.getAllByTestId('markdown')).toHaveLength(2);
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    it('renders AI typing indicator when generating', () => {
      render(<MessageList messages={[]} isGenerating={true} currentStreamedText="" />);
      expect(screen.getByText('Thinking')).toBeInTheDocument();
    });

    it('renders streamed text when available', () => {
      render(
        <MessageList messages={[]} isGenerating={true} currentStreamedText="I am thinking..." />
      );
      expect(screen.getByText('I am thinking...')).toBeInTheDocument();
    });
  });
});
