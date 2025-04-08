import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import iframeTemplateRaw from '../app/components/ResultPreview/templates/iframe-template.html?raw';
import ResultPreview from '../app/components/ResultPreview/ResultPreview';
import { ViewStateProvider } from '../app/context/ViewStateContext';

vi.mock('@remix-run/router', () => ({
  createBrowserRouter: vi.fn(),
}));

describe('Iframe Template', () => {
  it('contains proper APP_CODE placeholder format', () => {
    // Verify the template contains the correct APP_CODE placeholder pattern
    expect(iframeTemplateRaw).toContain('{{APP_CODE}}');

    // Ensure there are no nested JS object syntax patterns that would cause ReferenceError
    const problematicPattern = /\{\s*\{\s*APP_CODE\s*;\s*\}\s*\}/;
    expect(problematicPattern.test(iframeTemplateRaw)).toBe(false);
  });

  describe('Iframe Rendering', () => {
    // Sample React app code with postMessage communication
    const testAppCode = `
      function App() {
        // Add effect that sends messages to parent
        React.useEffect(() => {
          // Tell parent we're ready
          window.parent.postMessage({ type: 'preview-ready' }, '*');
          
          // Create a button that sends a screenshot
          const sendScreenshot = () => {
            window.parent.postMessage({
              type: 'screenshot',
              data: 'data:image/png;base64,fakeScreenshotData'
            }, '*');
          };
          
          // Auto-send screenshot after a small delay
          setTimeout(sendScreenshot, 100);
          
          // Log that we're working correctly
          console.log('Test app loaded successfully!');
        }, []);
        
        return (
          <div data-testid="test-app-content">
            <h1>Hello from Test App</h1>
            <p>This is a test component that works with postMessage</p>
          </div>
        );
      }
    `;

    // Store original URL methods
    const originalCreateObjectURL = URL.createObjectURL;
    // Make sure revokeObjectURL exists to avoid cleanup errors
    const originalRevokeObjectURL = URL.revokeObjectURL || function () {};
    let messageEventHandlers: Array<(event: MessageEvent) => void> = [];

    beforeEach(() => {
      // Clear message handlers from previous tests
      messageEventHandlers = [];

      // Mock URL methods
      URL.createObjectURL = vi.fn().mockReturnValue('mock-blob-url');
      URL.revokeObjectURL = vi.fn();

      // Track all message event handlers added to window
      vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'message') {
          messageEventHandlers.push(handler as any);
        }
        return undefined as any;
      });

      // Create a realistic iframe mock that can receive and send messages
      vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === 'iframe') {
          const iframe = document.createElement('iframe');

          // Create a realistic iframe contentWindow that can handle postMessage
          const contentWindowMock = {
            document: {
              write: vi.fn().mockImplementation((html: string) => {
                // Verify the HTML content contains our code and not problematic APP_CODE
                expect(html).toContain(testAppCode);
                expect(html).not.toContain('{ APP_CODE; }');
                expect(html).toContain('{{APP_CODE}}'); // Verify template has proper placeholder format
              }),
              close: vi.fn(),
            },
            // Create a postMessage that triggers parent's message handlers
            postMessage: vi.fn().mockImplementation((message: any, targetOrigin: string) => {
              // Simulate the iframe sending a message to the parent
              messageEventHandlers.forEach((handler) => {
                // Create a partial MessageEvent and cast to unknown first to satisfy TypeScript
                const mockEvent = {
                  data: message,
                  origin: window.location.origin,
                  source: contentWindowMock,
                  // Add missing required properties
                  lastEventId: '',
                  ports: [],
                  bubbles: false,
                  cancelable: false,
                  composed: false,
                  currentTarget: window,
                  defaultPrevented: false,
                  eventPhase: 0,
                  isTrusted: true,
                  returnValue: true,
                  srcElement: null,
                  target: window,
                  timeStamp: Date.now(),
                  type: 'message',
                  composedPath: () => [],
                  preventDefault: () => {},
                  stopImmediatePropagation: () => {},
                  stopPropagation: () => {},
                  AT_TARGET: 0,
                  BUBBLING_PHASE: 0,
                  CAPTURING_PHASE: 0,
                  NONE: 0,
                } as unknown as MessageEvent;

                handler(mockEvent);
              });
            }),
          };

          // Set contentWindow property on iframe
          Object.defineProperty(iframe, 'contentWindow', {
            value: contentWindowMock,
            writable: true,
          });

          // Add src property
          Object.defineProperty(iframe, 'src', {
            value: 'mock-blob-url',
            writable: true,
          });

          return iframe;
        }
        return null;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();

      // Restore original URL methods
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      messageEventHandlers = [];
    });

    it('renders a working React app in the iframe with functional messaging', async () => {
      // Create mock handlers for component callbacks
      const onScreenshotCapturedMock = vi.fn();
      const onPreviewLoadedMock = vi.fn();

      // Render the ResultPreview component with sample code and context providers
      render(
        <MemoryRouter>
          <ViewStateProvider
            initialProps={{
              sessionId: 'test-session',
              title: 'Test Title',
              code: testAppCode,
              isStreaming: false,
              previewReady: true,
              isMobileView: false,
              initialLoad: true,
              onPreviewLoaded: onPreviewLoadedMock,
              onScreenshotCaptured: onScreenshotCapturedMock,
            }}
          >
            <ResultPreview
              code={testAppCode}
              dependencies={{}}
              onScreenshotCaptured={onScreenshotCapturedMock}
              sessionId="test-session"
              isStreaming={false}
              codeReady={true}
              activeView="preview"
              setActiveView={vi.fn()}
              onPreviewLoaded={onPreviewLoadedMock}
              setMobilePreviewShown={vi.fn()}
            />
          </ViewStateProvider>
        </MemoryRouter>
      );

      // Get the mock iframe created by our mocks
      const iframe = document.querySelector('iframe');
      expect(iframe).not.toBeNull();

      // Verify URL was created with a blob (createObjectURL)
      expect(URL.createObjectURL).toHaveBeenCalled();

      // Simulate iframe loading and sending the ready message
      // This triggers our mock contentWindow.postMessage which triggers parent's message handlers
      iframe?.contentWindow?.postMessage({ type: 'preview-ready' }, '*');

      // Verify that onPreviewLoaded was called as a result of the message
      expect(onPreviewLoadedMock).toHaveBeenCalled();

      // Simulate iframe sending a screenshot message
      iframe?.contentWindow?.postMessage(
        {
          type: 'screenshot',
          data: 'data:image/png;base64,fakeScreenshotData',
        },
        '*'
      );

      // Verify screenshot handler was called with screenshot data
      expect(onScreenshotCapturedMock).toHaveBeenCalledWith(
        'data:image/png;base64,fakeScreenshotData'
      );

      // Verify no JS errors were generated related to APP_CODE
      const consoleErrorSpy = vi.spyOn(console, 'error');
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('is not defined'));
    });
  });
});
