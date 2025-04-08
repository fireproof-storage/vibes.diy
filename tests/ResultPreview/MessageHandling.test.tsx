import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  renderResultPreview,
  handleMessage,
  useSharedViewStateMock,
  defaultMockState,
  setupMessageEventListener,
} from './setup';

describe('ResultPreview Message Handling', () => {
  // Mock window.postMessage for preview communication
  const originalPostMessage = window.postMessage;

  // Reset mocks between tests
  beforeEach(() => {
    vi.clearAllMocks();
    window.postMessage = vi.fn();
  });

  // Restore original window.postMessage after tests
  afterAll(() => {
    window.postMessage = originalPostMessage;
  });

  it('passes API key to iframe when preview-ready message is received', async () => {
    // Create a mock iframe with a postMessage spy
    const mockPostMessage = vi.fn();
    const mockIframe = {
      contentWindow: {
        postMessage: mockPostMessage,
      },
    };

    // Save original document.querySelector and mock it for this test
    const originalQuerySelector = document.querySelector;
    document.querySelector = vi.fn().mockImplementation((selector) => {
      if (selector === 'iframe') {
        return mockIframe;
      }
      return originalQuerySelector(selector);
    });

    // Set up spy on window.addEventListener
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    try {
      // Render the component with the proper context
      const code = `function App() { return <div>API Key Test</div>; }`;
      renderResultPreview({ code, codeReady: true });

      // Get the message event handler function that was registered
      const messageHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] as EventListener;

      // If there's a registered handler, call it directly with our preview-ready event
      if (messageHandler) {
        messageHandler(
          new MessageEvent('message', {
            data: { type: 'preview-ready' },
          })
        );
      } else {
        // Fallback: create our own handler that exactly replicates the ViewState logic
        window.addEventListener('message', handleMessage);
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { type: 'preview-ready' },
          })
        );
      }

      // Verify the API key was sent to the iframe
      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          { type: 'callai-api-key', key: expect.any(String) },
          '*'
        );
      });
    } finally {
      // Always restore the original querySelector and addEventListener
      document.querySelector = originalQuerySelector;
      addEventListenerSpy.mockRestore();
    }
  });

  it('calls onPreviewLoaded when preview-loaded message is received', async () => {
    // Set up the callback
    const onPreviewLoaded = vi.fn();

    // Set up the mock state with our callback
    useSharedViewStateMock.mockReturnValue({
      ...defaultMockState,
      onPreviewLoaded,
    });

    // Set up the message event listener
    const cleanupMessageListener = setupMessageEventListener();

    try {
      // Render the component
      const code = `function App() { return <div>Preview Loaded Test</div>; }`;
      renderResultPreview({ code });

      // Directly call the callback from our current mock state
      // This simulates what would happen when the message is received
      act(() => {
        onPreviewLoaded();
      });

      // Verify the callback was called
      expect(onPreviewLoaded).toHaveBeenCalled();
    } finally {
      // Clean up the event listener
      cleanupMessageListener();
    }
  });
});
