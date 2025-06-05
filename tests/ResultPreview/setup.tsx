import { vi, beforeEach, afterAll } from 'vitest';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock URL methods
const mockObjectUrl = 'mock-blob-url';
URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);
URL.revokeObjectURL = vi.fn();

// Mock Sandpack components
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

// Mock scroll controller
vi.mock('../app/components/ResultPreview/SandpackScrollController', () => ({
  default: () => null,
}));

// Mock IframeContent to avoid iframe issues
vi.mock('../app/components/ResultPreview/IframeContent', () => ({
  default: () => (
    <div data-testid="sandpack-provider" className="h-full">
      <div>
        <iframe data-testid="preview-iframe" title="Preview" />
      </div>
      <div data-testid="sandpack-editor">Code Editor Content</div>
    </div>
  ),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.postMessage
const originalPostMessage = window.postMessage;
window.postMessage = vi.fn();
const originalGetItem = Storage.prototype.getItem;

beforeEach(() => {
  vi.clearAllMocks();
  window.postMessage = vi.fn();
  Storage.prototype.getItem = function (key) {
    if (key === 'vibes-openrouter-key') {
      return JSON.stringify({ key: 'test-api-key', hash: 'test-hash' });
    }
    return originalGetItem.call(this, key);
  };
});

afterAll(() => {
  window.postMessage = originalPostMessage;
  Storage.prototype.getItem = originalGetItem;
});
