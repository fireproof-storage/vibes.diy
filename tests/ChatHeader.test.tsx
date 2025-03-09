import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from '../app/components/ChatHeader';

describe('ChatHeader', () => {
  it('renders correctly', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();
    const onRestart = vi.fn();

    render(
      <ChatHeader
        onToggleSidebar={onToggleSidebar}
        onNewChat={onNewChat}
        isGenerating={false}
        restartCount={0}
        onRestart={onRestart}
      />
    );

    expect(screen.getByLabelText('Toggle chat history')).toBeDefined();
    expect(screen.getByLabelText('New Chat')).toBeDefined();
    expect(screen.getByLabelText('Restart')).toBeDefined();
  });

  it('calls onToggleSidebar when the toggle button is clicked', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();
    const onRestart = vi.fn();

    render(
      <ChatHeader
        onToggleSidebar={onToggleSidebar}
        onNewChat={onNewChat}
        isGenerating={false}
        restartCount={0}
        onRestart={onRestart}
      />
    );

    const toggleButton = screen.getByLabelText('Toggle chat history');
    fireEvent.click(toggleButton);

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('calls onNewChat when the new chat button is clicked', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();
    const onRestart = vi.fn();

    render(
      <ChatHeader
        onToggleSidebar={onToggleSidebar}
        onNewChat={onNewChat}
        isGenerating={false}
        restartCount={0}
        onRestart={onRestart}
      />
    );

    const newChatButton = screen.getByLabelText('New Chat');
    fireEvent.click(newChatButton);

    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('disables the new chat button when isGenerating is true', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();
    const onRestart = vi.fn();

    render(
      <ChatHeader
        onToggleSidebar={onToggleSidebar}
        onNewChat={onNewChat}
        isGenerating={true}
        restartCount={0}
        onRestart={onRestart}
      />
    );

    const newChatButton = screen.getByLabelText('New Chat');
    expect(newChatButton).toBeDisabled();

    fireEvent.click(newChatButton);
    expect(onNewChat).not.toHaveBeenCalled();
  });

  it('calls onRestart when the restart button is clicked', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();
    const onRestart = vi.fn();

    render(
      <ChatHeader
        onToggleSidebar={onToggleSidebar}
        onNewChat={onNewChat}
        isGenerating={false}
        restartCount={0}
        onRestart={onRestart}
      />
    );

    const restartButton = screen.getByLabelText('Restart');
    fireEvent.click(restartButton);

    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
