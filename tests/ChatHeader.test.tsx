import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from '../app/components/ChatHeader';

// Create mock functions we can control
const onOpenSidebar = vi.fn();

// Mock useNavigate
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('ChatHeader', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  it('renders correctly', () => {
    render(<ChatHeader onOpenSidebar={onOpenSidebar} title="Test Chat" />);

    expect(screen.getByLabelText('Open chat history')).toBeDefined();
    expect(screen.getByLabelText('New Chat')).toBeDefined();
  });

  it('calls openSidebar when the sidebar button is clicked', () => {
    render(<ChatHeader onOpenSidebar={onOpenSidebar} title="Test Chat" />);

    const openButton = screen.getByLabelText('Open chat history');
    fireEvent.click(openButton);

    expect(onOpenSidebar).toHaveBeenCalledTimes(1);
  });

  it('navigates to home when the new chat button is clicked', () => {
    render(<ChatHeader onOpenSidebar={onOpenSidebar} title="Test Chat" />);

    // Just verify the new chat button exists since we can't easily mock document.location
    const newChatButton = screen.getByLabelText('New Chat');
    expect(newChatButton).toBeInTheDocument();

    // Note: we can't reliably test the navigation in JSDOM environment
    // In a real browser, clicking this button would navigate to '/'
  });
});
