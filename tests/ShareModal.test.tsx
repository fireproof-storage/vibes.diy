import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShareModal } from '../app/components/ResultPreview/ShareModal';

// Set up mock for createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock for clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
  writable: true,
});

describe('ShareModal Component', () => {
  const mockButtonRef = { current: document.createElement('button') };
  const mockOnClose = vi.fn();
  const mockOnPublish = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.resetAllMocks();
    mockOnPublish.mockClear();
    mockOnClose.mockClear();
  });

  it('renders correctly when no published URL exists', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Should show publish button but not URL field
    expect(screen.getByText('Publish App')).toBeInTheDocument();
    expect(screen.getByText(/Publish your app for anyone to share and remix/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders correctly when a published URL exists', () => {
    const publishedUrl = 'https://test-app.vibecode.garden';

    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        publishedAppUrl={publishedUrl}
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Should show URL field and update button
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByDisplayValue(publishedUrl)).toBeInTheDocument();
    expect(screen.getByText('Update Code')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ShareModal
        isOpen={false}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Nothing should be rendered
    expect(screen.queryByText('Publish App')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Publish your app for anyone to share and remix/)
    ).not.toBeInTheDocument();
  });

  it('calls onPublish when publish button is clicked', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Click publish button
    fireEvent.click(screen.getByText('Publish App'));

    // Verify onPublish was called
    expect(mockOnPublish).toHaveBeenCalledTimes(1);
  });

  it('calls onPublish when update button is clicked', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        publishedAppUrl="https://test-app.vibecode.garden"
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Click update button
    fireEvent.click(screen.getByText('Update Code'));

    // Verify onPublish was called
    expect(mockOnPublish).toHaveBeenCalledTimes(1);
  });

  it('shows success message after updating', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        publishedAppUrl="https://test-app.vibecode.garden"
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Click update button
    fireEvent.click(screen.getByText('Update Code'));

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Updated!')).toBeInTheDocument();
    });
  });

  it('shows copy success icon when URL is copied', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        publishedAppUrl="https://test-app.vibecode.garden"
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Click copy button - use a more specific selector to avoid duplicate title issues
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(
      (button) => button.classList.contains('ml-1') && button.classList.contains('p-1')
    );

    if (!copyButton) {
      throw new Error('Copy button not found');
    }

    fireEvent.click(copyButton);

    // Verify clipboard API was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://test-app.vibecode.garden');

    // Should show success state (look for SVG with green color class)
    await waitFor(() => {
      const successIcon = document.querySelector('.text-green-500');
      expect(successIcon).not.toBeNull();
    });
  });

  it('disables publish button while publishing', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        onPublish={mockOnPublish}
        isPublishing={true}
      />
    );

    // Get the button by role menuitem since that's how it's defined in the component
    const publishButton = screen.getByRole('menuitem');
    expect(publishButton).toBeDisabled();

    // Clicking it shouldn't call onPublish
    fireEvent.click(publishButton);
    expect(mockOnPublish).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Find and click the backdrop (parent div containing the modal)
    const backdrop = screen.getByLabelText('Share menu');
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles ESC key to close the modal', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={mockOnClose}
        buttonRef={mockButtonRef}
        onPublish={mockOnPublish}
        isPublishing={false}
      />
    );

    // Simulate ESC key press on modal
    const modal = screen.getByLabelText('Share menu');
    fireEvent.keyDown(modal, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
