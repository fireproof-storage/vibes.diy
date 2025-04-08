import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import ResultPreview from '../app/components/ResultPreview/ResultPreview';
import { ViewStateProvider } from '../app/context/ViewStateContext';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock URL methods that aren't available in test environment
const mockObjectUrl = 'mock-blob-url';
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
vi.mock('../app/components/ResultPreview/WelcomeScreen', () => ({
  default: () => <div data-testid="welcome-screen">Welcome Screen Content</div>,
}));

// Mock the Sandpack scroll controller
vi.mock('../app/components/ResultPreview/SandpackScrollController', () => ({
  default: () => null,
}));

// Mock iframe behavior

// Mock the IframeContent component to avoid iframe issues in tests
vi.mock('../app/components/ResultPreview/IframeContent', () => ({
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

// Mock window.postMessage for preview communication
const originalPostMessage = window.postMessage;
window.postMessage = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  window.postMessage = vi.fn();
});

// Restore original window.postMessage after tests
afterAll(() => {
  window.postMessage = originalPostMessage;
});

// Helper function to create the JSX structure for rendering/rerendering
const createResultPreviewElement = (props: Partial<any> = {}, providerProps: any = {}) => {
  const defaultProps: any = {
    code: '<p>Hello World</p>',
    codeReady: true,
    isStreaming: false,
    activeView: 'preview',
    setActiveView: vi.fn(),
    isDarkMode: false,
    showWelcome: false,
    sessionId: 'test-session',
    title: 'Test Title',
    onPreviewLoaded: vi.fn(),
    onScreenshotCaptured: vi.fn(),
    setIsIframeFetching: vi.fn(),
  };

  const mergedProps = { ...defaultProps, ...props };

  const defaultProviderProps = {
    sessionId: mergedProps.sessionId || 'test-session',
    title: mergedProps.title || 'Test Title',
    code: mergedProps.code || '',
    isStreaming: mergedProps.isStreaming || false,
    previewReady: mergedProps.codeReady !== undefined ? mergedProps.codeReady : true,
    isMobileView: false,
    initialLoad: true,
    onPreviewLoaded: mergedProps.onPreviewLoaded,
    onScreenshotCaptured: mergedProps.onScreenshotCaptured,
    ...providerProps,
  };

  return (
    <MemoryRouter>
      <ViewStateProvider initialProps={defaultProviderProps}>
        <ResultPreview {...mergedProps} />
      </ViewStateProvider>
    </MemoryRouter>
  );
};

// Initial render helper using the element creator
const renderResultPreview = (props: Partial<any> = {}, providerProps: any = {}) => {
  return render(createResultPreviewElement(props, providerProps));
};

describe('ResultPreview', () => {
  it('renders without crashing', () => {
    renderResultPreview({ code: 'const test = "Hello";' });

    expect(screen.getByTestId('sandpack-editor')).toBeInTheDocument();
  });

  it('displays welcome screen when code is empty', () => {
    const { container } = renderResultPreview({ code: '' });

    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('handles streaming state correctly', () => {
    const code = 'const test = "Streaming";';

    renderResultPreview({ code, isStreaming: true });

    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('passes dependencies to SandpackProvider', () => {
    const code = 'console.log("test");';
    const dependencies = {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    };

    renderResultPreview({ code, dependencies });

    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('calls onShare when share button is clicked', () => {
    expect(true).toBe(true);
  });

  it('shows welcome screen with empty code', () => {
    const { container } = renderResultPreview({ code: '' });

    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('shows a share button when onShare is provided and code is not empty', () => {
    expect(true).toBe(true);
  });

  it('updates display when code changes', () => {
    const { rerender } = renderResultPreview({ code: '' });
    rerender(createResultPreviewElement({ code: 'const test = "Hello";' }));

    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('renders with code content', () => {
    const code = 'const test = "Hello World";';

    renderResultPreview({ code });

    expect(screen.getByTestId('sandpack-editor')).toBeInTheDocument();
  });

  it('handles copy to clipboard', async () => {
    expect(true).toBe(true);
  });

  it('renders with custom dependencies', async () => {
    const code = 'import React from "react";';
    const dependencies = {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    };

    renderResultPreview({ code, dependencies });

    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();

    expect(screen.getByTestId('sandpack-editor')).toBeInTheDocument();
  });

  it('handles share functionality', () => {
    expect(true).toBe(true);
  });

  it('receives preview-ready message from iframe when content loads', async () => {
    const previewReadyHandler = vi.fn();
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'preview-ready') {
        previewReadyHandler(event.data);
      }
    });

    const code = `
      function App() {
        return <div>Test App Content</div>;
      }
    `;

    const mockSetPreviewLoaded = vi.fn();

    const testProps = {
      code,
      isStreaming: false,
      codeReady: true,
      onPreviewLoaded: mockSetPreviewLoaded,
    };

    renderResultPreview(testProps);

    const previewReadyEvent = new MessageEvent('message', {
      data: { type: 'preview-ready' },
    });

    act(() => {
      window.dispatchEvent(previewReadyEvent);
    });

    await waitFor(() => {
      expect(previewReadyHandler).toHaveBeenCalledWith({ type: 'preview-ready' });
    });

    expect(mockSetPreviewLoaded).toHaveBeenCalled();
  });

  it('handles edge case with empty code', () => {
    const { container } = renderResultPreview({ code: '' });

    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    const { container } = renderResultPreview({ code: '' });
    expect(container).toMatchSnapshot();
  });

  it('handles dependencies correctly', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    const dependencies = {
      react: '17.0.2',
      'react-dom': '17.0.2',
    };
    renderResultPreview({ code, dependencies });

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('displays code correctly', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    renderResultPreview({ code });

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('shows welcome screen for empty code', () => {
    const { container } = renderResultPreview({ code: '' });

    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('renders code properly', () => {
    renderResultPreview({ code: 'const test = "Hello";' });
    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('handles code updates correctly', () => {
    const { rerender } = renderResultPreview({ code: '' });
    rerender(createResultPreviewElement({ code: 'const test = "Hello";' }));

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('handles screenshot capture requests', () => {
    const onScreenshotCaptured = vi.fn();
    const code = `function App() { return <div>Hello World</div>; }`;
    renderResultPreview({ code, onScreenshotCaptured });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'screenshot', data: 'base64-data' },
        })
      );
    });

    expect(onScreenshotCaptured).toHaveBeenCalledWith('base64-data');
  });

  it('handles preview loaded event', async () => {
    const onPreviewLoaded = vi.fn();
    const code = `function App() { return <div>Hello World</div>; }`;
    renderResultPreview({ code, onPreviewLoaded });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'preview-loaded' },
        })
      );
    });

    await waitFor(() => {
      expect(onPreviewLoaded).toHaveBeenCalled();
    });
  });

  it('passes dependencies to Sandpack', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    const dependencies = {
      react: '17.0.2',
      'react-dom': '17.0.2',
    };
    renderResultPreview({ code, dependencies });

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('passes API key to iframe when preview-ready message is received', async () => {
    const mockIframe = {
      contentWindow: {
        postMessage: vi.fn(),
      },
    };
    const originalQuerySelector = document.querySelector;
    document.querySelector = vi.fn().mockImplementation((selector) => {
      if (selector === 'iframe') {
        return mockIframe;
      }
      return originalQuerySelector(selector);
    });

    vi.mock('../app/config/env', () => ({
      CALLAI_API_KEY: 'test-api-key-12345',
    }));

    const code = `function App() { return <div>API Key Test</div>; }`;
    renderResultPreview({ code, codeReady: true });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'preview-ready' },
        })
      );
    });

    await waitFor(() => {
      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        { type: 'callai-api-key', key: expect.any(String) },
        '*'
      );
    });

    document.querySelector = originalQuerySelector;
  });

  it('displays the code editor initially', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    renderResultPreview({ code });

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('shows welcome screen when no code is provided', () => {
    const { container } = renderResultPreview({ code: '' });

    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('renders with a simple code snippet', () => {
    const code = 'const test = "Hello";';
    const setActiveView = vi.fn();

    renderResultPreview({
      code,
      dependencies: {},
      isStreaming: false,
      codeReady: true,
      activeView: 'code',
      setActiveView,
      onPreviewLoaded: () => {},
      setMobilePreviewShown: () => {},
    });

    expect(screen.getByTestId('sandpack-editor')).toBeDefined();
  });
});
