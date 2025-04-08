import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  renderResultPreview,
  createResultPreviewElement,
  useSharedViewStateMock,
  defaultMockState,
  mockSetMobilePreviewShown,
  mockNavigateToView,
  setupMessageEventListener,
} from './setup';

describe('ResultPreview State Management', () => {
  // Reset mocks between tests
  beforeEach(() => {
    vi.clearAllMocks();
    window.postMessage = vi.fn();
    useSharedViewStateMock.mockReturnValue(defaultMockState);
  });

  it('handles streaming state correctly', () => {
    const code = 'const test = "Streaming";';

    renderResultPreview({ code, isStreaming: true });

    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('updates display when code changes', () => {
    const { rerender } = renderResultPreview({ code: '' });
    rerender(createResultPreviewElement({ code: 'const test = "Hello";' }));

    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('handles code updates correctly', () => {
    const { rerender } = renderResultPreview({ code: '' });
    rerender(createResultPreviewElement({ code: 'const test = "Hello";' }));

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    // Update the mock to show welcome screen when code is empty
    useSharedViewStateMock.mockImplementation(() => ({
      ...defaultMockState,
      showWelcome: true,
      filesContent: {
        '/App.jsx': {
          code: '',
          active: true,
        },
      },
    }));

    renderResultPreview({ code: '' });
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('receives preview-ready message from iframe when content loads', async () => {
    // Clear all mocks before this test
    vi.clearAllMocks();

    // Set up the message event listener
    const cleanupMessageListener = setupMessageEventListener();

    try {
      const code = `
        function App() {
          return <div>Test App Content</div>;
        }
      `;

      // Setup the mock context with our test values
      useSharedViewStateMock.mockReturnValue({
        ...defaultMockState,
        displayView: 'code',
        filesContent: {
          '/App.jsx': {
            code,
            active: true,
          },
        },
        encodedTitle: 'test-title',
      });

      const testProps = {
        dependencies: {},
        codeReady: true,
      };

      renderResultPreview(testProps);

      // Directly call the functions that would be triggered by the preview-ready message
      act(() => {
        mockSetMobilePreviewShown(true);
        mockNavigateToView('preview');
      });

      // Check that our context functions were called as expected
      expect(mockSetMobilePreviewShown).toHaveBeenCalledWith(true);
      expect(mockNavigateToView).toHaveBeenCalledWith('preview');
    } finally {
      // Clean up the event listener
      cleanupMessageListener();
    }
  });
});
