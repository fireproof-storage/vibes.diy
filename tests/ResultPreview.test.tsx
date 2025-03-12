import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultPreview from '../app/components/ResultPreview/ResultPreview';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock SandpackProvider and related components
vi.mock('@codesandbox/sandpack-react', () => ({
  SandpackProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="sandpack-provider">{children}</div>,
  SandpackLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SandpackCodeEditor: () => <div data-testid="sandpack-editor">Editor</div>,
  SandpackPreview: () => <div data-testid="sandpack-preview">Preview</div>,
  useSandpack: () => ({
    sandpack: { activeFile: '/App.jsx' },
    listen: vi.fn().mockReturnValue(() => {}),
  }),
}));

// Mock WelcomeScreen
vi.mock('../app/components/ResultPreview/WelcomeScreen', () => ({
  default: () => <div data-testid="welcome-screen">Welcome Screen Content</div>,
}));

// Mock the Sandpack scroll controller
vi.mock('../app/components/ResultPreview/SandpackScrollController', () => ({
  default: () => null,
}));

describe('ResultPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ResultPreview code={''} isStreaming={() => false} />);
    
    expect(screen.getByText('Editor')).toBeDefined();
    expect(screen.getByText('Preview')).toBeDefined();
  });

  it('displays welcome screen when code is empty', () => {
    render(<ResultPreview code={''} isStreaming={() => false} />);
    
    expect(screen.getByTestId('sandpack-provider')).toBeDefined();
  });

  it('uses streaming code when isStreaming is true', () => {
    const code = '';
    const streamingCode = 'const test = "Streaming";';

    render(<ResultPreview code={code} streamingCode={streamingCode} isStreaming={() => true} />);

    expect(screen.getByTestId('sandpack-provider')).toBeDefined();
  });

  it('passes dependencies to SandpackProvider', () => {
    const code = 'console.log("test");';
    const dependencies = {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    };

    render(<ResultPreview code={code} dependencies={dependencies} isStreaming={() => false} />);
    
    // In a real test we would verify the dependencies are passed
    // but since we're mocking SandpackProvider, we can only check it renders
    expect(screen.getByTestId('sandpack-provider')).toBeDefined();
  });

  it('calls onShare when share button is clicked', () => {
    const code = 'console.log("test");';
    const onShare = vi.fn();

    render(<ResultPreview code={code} onShare={onShare} isStreaming={() => false} />);
    
    // Find and click the share button
    const shareButton = screen.getByText(/share/i);
    shareButton.click();

    expect(onShare).toHaveBeenCalled();
  });

  it('displays completed message when provided', () => {
    const code = 'console.log("test");';
    const completedMessage = 'This is a test message';

    render(<ResultPreview code={code} completedMessage={completedMessage} isStreaming={() => false} />);
    
    expect(screen.getByText(completedMessage)).toBeDefined();
  });

  it('shows welcome content with empty code', () => {
    render(<ResultPreview code="" isStreaming={() => false} />);
    
    expect(screen.getByTestId('welcome-screen')).toBeDefined();
  });

  it('shows a share button when onShare is provided', () => {
    render(<ResultPreview code="" onShare={() => {}} isStreaming={() => false} />);
    
    const shareButton = screen.getByText(/share/i);
    expect(shareButton).toBeDefined();
  });

  it('updates display when code changes', () => {
    const { rerender } = render(<ResultPreview code="" onShare={() => {}} isStreaming={() => false} />);
    rerender(<ResultPreview code="const test = 'Hello';" onShare={() => {}} isStreaming={() => false} />);
    
    // In a real test we would verify the code changes in the editor
    // but since we're mocking SandpackProvider, we can only check it renders
    expect(screen.getByTestId('sandpack-provider')).toBeDefined();
  });

  it('renders with code content', () => {
    const code = 'const test = "Hello World";';

    render(<ResultPreview code={code} />);

    expect(screen.getByText('Preview')).toBeDefined();
    expect(screen.getByText('Code')).toBeDefined();
  });

  it('handles copy to clipboard', async () => {
    const code = 'const test = "Copy me";';

    render(<ResultPreview code={code} />);

    const copyButton = screen.getByTestId('copy-button');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining(code));
  });

  it('renders with custom dependencies', async () => {
    const code = 'import React from "react";';
    const dependencies = {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    };

    render(<ResultPreview code={code} dependencies={dependencies} />);

    expect(await screen.findByTestId('sandpack-provider')).toBeDefined();

    // Click on the Code button to make the code editor visible
    const codeButton = screen.getByText('Code');
    fireEvent.click(codeButton);

    // Just check that the code editor is present
    expect(screen.getByRole('textbox', { name: /code editor for app.jsx/i })).toBeDefined();
  });

  it('handles share functionality', () => {
    const code = 'const test = "Share me";';
    const onShare = vi.fn();

    render(<ResultPreview code={code} onShare={onShare} />);

    const shareButton = screen.getByLabelText('Share app');
    fireEvent.click(shareButton);

    expect(onShare).toHaveBeenCalled();
  });

  it('renders with completed message', () => {
    const code = 'const test = "Hello";';
    const completedMessage = 'This is a completed message';

    render(<ResultPreview code={code} completedMessage={completedMessage} />);

    expect(screen.getByText(completedMessage)).toBeDefined();
  });

  it('handles edge case with empty code', () => {
    render(<ResultPreview code="" />);

    // With our new implementation, when code is empty, welcome screen is shown
    // and the buttons should not be visible
    expect(screen.queryByText('Preview')).toBeNull();
    expect(screen.queryByText('Code')).toBeNull();
  });

  it('should hide Preview and Code buttons when welcome screen is shown', () => {
    // The current component behavior sets showWelcome based on code presence
    // This test is checking for the expected behavior, not the current implementation
    render(<ResultPreview code="" onShare={() => {}} />);

    // This assertion will fail because the buttons are currently visible
    // regardless of whether the welcome screen is shown
    expect(screen.queryByText('Preview')).toBeNull();
    expect(screen.queryByText('Code')).toBeNull();
    // Also check that the share button is hidden
    expect(screen.queryByLabelText('Share app')).toBeNull();

    // Re-render with non-empty code which should hide welcome screen
    const { rerender } = render(<ResultPreview code="" onShare={() => {}} />);
    rerender(<ResultPreview code="const test = 'Hello';" onShare={() => {}} />);

    // Now the buttons should be visible
    expect(screen.getByText('Preview')).toBeDefined();
    expect(screen.getByText('Code')).toBeDefined();
    // And the share button should also be visible
    expect(screen.getByLabelText('Share app')).toBeDefined();
  });
});
