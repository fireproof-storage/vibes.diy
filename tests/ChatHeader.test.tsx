import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from '../app/components/ChatHeader';

describe('ChatHeader', () => {
  it('renders correctly', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();

    render(
      <ChatHeader onToggleSidebar={onToggleSidebar} onNewChat={onNewChat} isGenerating={false} isExpanding={false} setIsExpanding={vi.fn()} />
    );

    expect(screen.getByLabelText('Toggle chat history')).toBeDefined();
    expect(screen.getByLabelText('New Chat')).toBeDefined();
  });

  it('calls onToggleSidebar when the toggle button is clicked', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();

    render(
      <ChatHeader onToggleSidebar={onToggleSidebar} onNewChat={onNewChat} isGenerating={false} isExpanding={false} setIsExpanding={vi.fn()} />
    );

    const toggleButton = screen.getByLabelText('Toggle chat history');
    fireEvent.click(toggleButton);

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('calls onNewChat when the new chat button is clicked', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();

    render(
      <ChatHeader onToggleSidebar={onToggleSidebar} onNewChat={onNewChat} isGenerating={false} isExpanding={false} setIsExpanding={vi.fn()} />
    );

    const newChatButton = screen.getByLabelText('New Chat');
    fireEvent.click(newChatButton);

    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('disables the new chat button when isGenerating is true', () => {
    const onToggleSidebar = vi.fn();
    const onNewChat = vi.fn();

    render(
      <ChatHeader onToggleSidebar={onToggleSidebar} onNewChat={onNewChat} isGenerating={true} isExpanding={false} setIsExpanding={vi.fn()} />
    );

    const newChatButton = screen.getByLabelText('New Chat');
    expect(newChatButton).toBeDisabled();

    fireEvent.click(newChatButton);
    expect(onNewChat).not.toHaveBeenCalled();
  });
});
