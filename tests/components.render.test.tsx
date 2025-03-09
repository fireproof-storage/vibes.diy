import { describe, it, expect, vi } from 'vitest';
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

describe('Component Rendering', () => {
  describe('ChatHeader', () => {
    it('renders without crashing', () => {
      const onToggleSidebar = vi.fn();
      const onNewChat = vi.fn();
      render(
        <ChatHeader onToggleSidebar={onToggleSidebar} onNewChat={onNewChat} isGenerating={false} />
      );
      expect(screen.getByLabelText('New Chat')).toBeInTheDocument();
    });

    it('applies tooltip classes correctly', () => {
      const onToggleSidebar = vi.fn();
      const onNewChat = vi.fn();
      const { container } = render(
        <ChatHeader onToggleSidebar={onToggleSidebar} onNewChat={onNewChat} isGenerating={false} />
      );

      // Check if the button has the peer class
      const button = screen.getByLabelText('New Chat');
      expect(button).toHaveClass('peer');

      // Check if the tooltip has correct classes
      const tooltip = container.querySelector('.absolute.top-full');
      expect(tooltip).toHaveClass('peer-hover:opacity-100');
    });

    it('disables new chat button when generating', () => {
      const onToggleSidebar = vi.fn();
      const onNewChat = vi.fn();
      render(
        <ChatHeader onToggleSidebar={onToggleSidebar} onNewChat={onNewChat} isGenerating={true} />
      );

      expect(screen.getByLabelText('New Chat')).toBeDisabled();
    });
  });

  describe('SessionSidebar', () => {
    it('renders in hidden state', () => {
      const onToggle = vi.fn();
      const onSelectSession = vi.fn();
      const { container } = render(
        <SessionSidebar isVisible={false} onToggle={onToggle} onSelectSession={onSelectSession} />
      );
      // Check that it has the hidden class
      expect(container.firstChild).toHaveClass('-translate-x-full');
    });

    it('renders in visible state', () => {
      const onToggle = vi.fn();
      const onSelectSession = vi.fn();
      const { container } = render(
        <SessionSidebar isVisible={true} onToggle={onToggle} onSelectSession={onSelectSession} />
      );
      expect(container.firstChild).toHaveClass('translate-x-0');

      // Check that content is rendered when visible
      expect(screen.getByText('App History')).toBeInTheDocument();
    });

    it('shows empty state when no sessions', () => {
      const onToggle = vi.fn();
      const onSelectSession = vi.fn();
      render(
        <SessionSidebar isVisible={true} onToggle={onToggle} onSelectSession={onSelectSession} />
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
