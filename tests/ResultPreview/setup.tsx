import { vi } from 'vitest';
import React from 'react';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock URL methods that aren't available in test environment
export const mockObjectUrl = 'mock-blob-url';
URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);
URL.revokeObjectURL = vi.fn();

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
vi.mock('../../app/components/ResultPreview/WelcomeScreen', () => ({
  default: () => <div data-testid="welcome-screen">Welcome Screen Content</div>,
}));

// Mock the Sandpack scroll controller
vi.mock('../../app/components/ResultPreview/SandpackScrollController', () => ({
  default: () => null,
}));

// Mock the environment configuration
vi.mock('../../app/config/env', () => ({
  CALLAI_API_KEY: 'test-api-key-12345',
}));

// Mock the IframeContent component to avoid iframe issues in tests
vi.mock('../../app/components/ResultPreview/IframeContent', () => ({
  default: ({ activeView }: { activeView: string }) => (
    <div data-testid="sandpack-provider" className="h-full">
      <div
        style={{
          visibility: activeView === 'preview' ? 'visible' : 'hidden',
          position: activeView === 'preview' ? 'static' : 'absolute',
        }}
      >
        <iframe data-testid="preview-iframe" title="Preview" />
      </div>
      <div
        data-testid="sandpack-editor"
        style={{
          visibility: activeView === 'code' ? 'visible' : 'hidden',
          position: activeView === 'code' ? 'static' : 'absolute',
        }}
      >
        Code Editor Content
      </div>
    </div>
  ),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the ViewStateContext module
export const mockNavigateToView = vi.fn();
export const mockSetMobilePreviewShown = vi.fn();
export const mockSetUserClickedBack = vi.fn();
export const mockHandleBackAction = vi.fn();

// Create a mock for the message handler that simulates the behavior in ViewState.ts
export const mockMessageHandler = vi.fn().mockImplementation(({ data }: MessageEvent) => {
  if (data) {
    if (data.type === 'preview-ready' || data.type === 'preview-loaded') {
      // These functions should be called when preview-ready is received
      mockSetMobilePreviewShown(true);
      mockNavigateToView('preview');

      // Get the current state to access the latest callbacks
      const currentState =
        useSharedViewStateMock.mock.results[useSharedViewStateMock.mock.results.length - 1]?.value;

      // Call onPreviewLoaded if it exists in the current state
      if (currentState?.onPreviewLoaded) {
        currentState.onPreviewLoaded();
      }
    } else if (data.type === 'screenshot' && data.data) {
      // Get the current state to access the latest callbacks
      const currentState =
        useSharedViewStateMock.mock.results[useSharedViewStateMock.mock.results.length - 1]?.value;

      // This should be called when screenshot data is received
      if (currentState?.onScreenshotCaptured) {
        currentState.onScreenshotCaptured(data.data);
      }
    }
  }
});

// Set up a global message event listener for tests
export function setupMessageEventListener() {
  // Remove any existing listener first to prevent duplicates
  window.removeEventListener('message', mockMessageHandler);
  window.addEventListener('message', mockMessageHandler);
  return () => window.removeEventListener('message', mockMessageHandler);
}

export const defaultMockState = {
  displayView: 'preview',
  isDarkMode: false,
  filesContent: {
    '/App.jsx': {
      code: '<p>Hello World</p>',
      active: true,
    },
  },
  showWelcome: false,
  navigateToView: mockNavigateToView,
  setMobilePreviewShown: mockSetMobilePreviewShown,
  setUserClickedBack: mockSetUserClickedBack,
  handleBackAction: mockHandleBackAction,
  encodedTitle: 'test-session',
  isStreaming: false,
  onScreenshotCaptured: null as ((data: string | null) => void) | null,
  onPreviewLoaded: null as (() => void) | null,
};

export const useSharedViewStateMock = vi.fn().mockImplementation(() => defaultMockState);

// Mock the ViewStateContext module
vi.mock('../../app/context/ViewStateContext', () => ({
  useSharedViewState: () => useSharedViewStateMock(),
  ViewStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Helper function to create the JSX structure for rendering/rerendering
export function createResultPreviewElement(props: Partial<any> = {}, contextProps: any = {}) {
  const mergedState = {
    ...defaultMockState,
    ...contextProps,
  };

  useSharedViewStateMock.mockReturnValue(mergedState);

  return (
    <MemoryRouter>
      <div className="h-full">
        <ResultPreview
          code={props.code ?? ''}
          dependencies={props.dependencies ?? {}}
          isStreaming={props.isStreaming ?? false}
          codeReady={props.codeReady ?? true}
          activeView={props.activeView ?? 'preview'}
          setActiveView={props.setActiveView ?? vi.fn()}
          onPreviewLoaded={props.onPreviewLoaded ?? vi.fn()}
          setMobilePreviewShown={props.setMobilePreviewShown ?? vi.fn()}
        />
      </div>
    </MemoryRouter>
  );
}

// Initial render helper using the element creator
export function renderResultPreview(props: Partial<any> = {}, providerProps: any = {}) {
  return render(createResultPreviewElement(props, providerProps));
}

// We need to recreate the actual message handler from ViewState.ts
// to properly simulate the event handling chain
export function handleMessage({ data }: MessageEvent) {
  if (data?.type === 'preview-ready') {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    iframe?.contentWindow?.postMessage({ type: 'callai-api-key', key: 'test-api-key-12345' }, '*');
  }
}

// Import statements needed for the helper functions
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
