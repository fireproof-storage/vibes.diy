import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from '../app/components/ChatHeader';

// Create mock functions we can control
const openSidebar = vi.fn();
const handleNewChat = vi.fn();
let isGeneratingValue = false;

// Setup a more appropriate mock for the context
vi.mock('../app/context/ChatContext', () => ({
  useChatContext: () => ({
    isGenerating: isGeneratingValue,
    openSidebar,
    closeSidebar: vi.fn(),
    handleNewChat,
  }),
}));

describe('ChatHeader', () => {
  beforeEach(() => {
    // Reset mocks and values before each test
    vi.resetAllMocks();
    isGeneratingValue = false;
  });

  it('renders correctly', () => {
    render(<ChatHeader />);

    expect(screen.getByLabelText('Toggle chat history')).toBeDefined();
    expect(screen.getByLabelText('New Chat')).toBeDefined();
  });

  it('calls openSidebar when the toggle button is clicked', () => {
    render(<ChatHeader />);

    const toggleButton = screen.getByLabelText('Toggle chat history');
    fireEvent.click(toggleButton);

    expect(openSidebar).toHaveBeenCalledTimes(1);
  });

  it('calls handleNewChat when the new chat button is clicked', () => {
    render(<ChatHeader />);

    const newChatButton = screen.getByLabelText('New Chat');
    fireEvent.click(newChatButton);

    expect(handleNewChat).toHaveBeenCalledTimes(1);
  });

  it('disables the new chat button when isGenerating is true', () => {
    // Set isGenerating to true for this test
    isGeneratingValue = true;

    render(<ChatHeader />);

    const newChatButton = screen.getByLabelText('New Chat');
    expect(newChatButton).toBeDisabled();

    fireEvent.click(newChatButton);
    expect(handleNewChat).not.toHaveBeenCalled();
  });
});
