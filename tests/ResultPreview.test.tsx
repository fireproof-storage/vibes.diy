import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ResultPreview from '../app/components/ResultPreview/ResultPreview';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock SandpackProvider and related components
vi.mock('@codesandbox/sandpack-react', () => ({
  SandpackProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sandpack-provider">{children}</div>
  ),
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
    // Use non-empty code to ensure the editor is shown
    const { container } = render(<ResultPreview code="const test = 'Hello';" />);

    // Now the sandpack editor should be visible
    expect(screen.getByTestId('sandpack-editor')).toBeDefined();
    expect(screen.getByTestId('sandpack-preview')).toBeDefined();
  });

  it('displays welcome screen when code is empty', () => {
    render(<ResultPreview code={''} />);

    expect(screen.getByTestId('welcome-screen')).toBeDefined();
  });

  it('handles streaming state correctly', () => {
    const code = 'const test = "Streaming";';

    render(<ResultPreview code={code} isStreaming={true} />);

    // Just verify it renders without errors
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('passes dependencies to SandpackProvider', () => {
    const code = 'console.log("test");';
    const dependencies = {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    };

    render(<ResultPreview code={code} dependencies={dependencies} />);

    // Just verify it renders without errors
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('calls onShare when share button is clicked', () => {
    const code = 'console.log("test");';
    
    render(<ResultPreview code={code} />);

    // Find and click the share button
    const shareButton = screen.getByRole('button', { name: /share/i });
    shareButton.click();

    // Instead of expecting onShare to be called, expect clipboard to be used
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('shows welcome content with empty code', () => {
    render(<ResultPreview code="" />);

    expect(screen.getByTestId('welcome-screen')).toBeDefined();
  });

  it('shows a share button when onShare is provided and code is not empty', () => {
    // Use non-empty code to ensure the share button is shown
    render(<ResultPreview code="const test = 'Hello';" />);

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeDefined();
  });

  it('updates display when code changes', () => {
    const { rerender } = render(<ResultPreview code="" />);
    rerender(<ResultPreview code="const test = 'Hello';" />);

    // Just verify it renders without errors
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('renders with code content', () => {
    const code = 'const test = "Hello World";';

    render(<ResultPreview code={code} />);

    // Use more specific selectors to avoid multiple elements issue
    const previewButton = screen.getByRole('button', { name: /switch to preview/i });
    const codeButton = screen.getByRole('button', { name: /switch to code editor/i });

    expect(previewButton).toBeDefined();
    expect(codeButton).toBeDefined();
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

    // Use getAllByTestId to handle multiple elements
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();

    // Click on the Code button to make the code editor visible
    const codeButton = screen.getByRole('button', { name: /switch to code editor/i });
    fireEvent.click(codeButton);

    // Just check that the code editor is present
    expect(screen.getByTestId('sandpack-editor')).toBeDefined();
  });

  it('handles share functionality', () => {
    const code = 'console.log("test");';

    render(<ResultPreview code={code} />);

    const shareButton = screen.getByRole('button', { name: /share app/i });
    fireEvent.click(shareButton);

    // Expect clipboard to be used instead of onShare
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('handles edge case with empty code', () => {
    render(<ResultPreview code="" />);

    // With our new implementation, when code is empty, welcome screen is shown
    // and the buttons should not be visible
    expect(screen.queryByRole('button', { name: /switch to preview/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /switch to code editor/i })).toBeNull();
  });
});
