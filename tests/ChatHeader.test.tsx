import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from '../app/components/ChatHeader';

// Create mock functions we can control
const onOpenSidebar = vi.fn();
const onNewChat = vi.fn();
let isStreamingFn: () => boolean;

describe('ChatHeader', () => {
  beforeEach(() => {
    // Reset mocks and values before each test
    vi.resetAllMocks();
    isStreamingFn = () => false;
  });

  it('renders correctly', () => {
    render(
      <ChatHeader onOpenSidebar={onOpenSidebar} onNewChat={onNewChat} isStreaming={isStreamingFn} />
    );

    expect(screen.getByLabelText('Open chat history')).toBeDefined();
    expect(screen.getByLabelText('New Chat')).toBeDefined();
  });

  it('calls openSidebar when the sidebar button is clicked', () => {
    render(
      <ChatHeader onOpenSidebar={onOpenSidebar} onNewChat={onNewChat} isStreaming={isStreamingFn} />
    );

    const openButton = screen.getByLabelText('Open chat history');
    fireEvent.click(openButton);

    expect(onOpenSidebar).toHaveBeenCalledTimes(1);
  });

  it('calls handleNewChat when the new chat button is clicked', () => {
    render(
      <ChatHeader onOpenSidebar={onOpenSidebar} onNewChat={onNewChat} isStreaming={isStreamingFn} />
    );

    const newChatButton = screen.getByLabelText('New Chat');
    fireEvent.click(newChatButton);

    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('allows creating a new chat even when isStreaming returns true', () => {
    // Set isStreaming to return true for this test
    isStreamingFn = () => true;

    render(
      <ChatHeader onOpenSidebar={onOpenSidebar} onNewChat={onNewChat} isStreaming={isStreamingFn} />
    );

    const newChatButton = screen.getByLabelText('New Chat');
    expect(newChatButton).not.toBeDisabled();

    fireEvent.click(newChatButton);
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });
});
