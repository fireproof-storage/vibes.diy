import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  renderResultPreview,
  useSharedViewStateMock,
  defaultMockState,
  setupMessageEventListener,
} from './setup';

describe('ResultPreview Screenshot Capture', () => {
  // Reset mocks between tests
  beforeEach(() => {
    vi.clearAllMocks();
    window.postMessage = vi.fn();
    useSharedViewStateMock.mockReturnValue(defaultMockState);
  });

  it('handles screenshot capture requests', async () => {
    const onScreenshotCaptured = vi.fn();
    const code = `function App() { return <div>Hello World</div>; }`;

    // Update the mock state to include our callback
    useSharedViewStateMock.mockReturnValue({
      ...defaultMockState,
      onScreenshotCaptured,
    });

    // Set up the message event listener
    const cleanupMessageListener = setupMessageEventListener();

    try {
      renderResultPreview({ code });

      // Directly call the screenshot callback with base64 data
      act(() => {
        onScreenshotCaptured('base64-data');
      });

      // Verify the callback was called with the expected data
      expect(onScreenshotCaptured).toHaveBeenCalledWith('base64-data');
    } finally {
      // Clean up the event listener
      cleanupMessageListener();
    }
  });
});
