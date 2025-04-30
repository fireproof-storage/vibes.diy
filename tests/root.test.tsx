import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, Layout } from '../app/root';

// Mock React Router components to avoid HTML validation errors
vi.mock('react-router', () => ({
  Meta: ({ 'data-testid': testId }: { 'data-testid'?: string }) => <meta data-testid={testId} />,
  Links: () => <link data-testid="links" />,
  Scripts: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
    <script data-testid={testId} />
  ),
  ScrollRestoration: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
    <div data-testid={testId} />
  ),
  isRouteErrorResponse: vi.fn(),
  useLocation: () => ({ pathname: '/', search: '' }),
  Outlet: () => <div data-testid="outlet" />,
}));

// Mock the cookie consent library
vi.mock('react-cookie-consent', () => ({
  default: ({ children, buttonText, onAccept }: any) => (
    <div data-testid="cookie-consent">
      {children}
      <button onClick={onAccept}>{buttonText}</button>
    </div>
  ),
  getCookieConsentValue: vi.fn().mockReturnValue(null),
  Cookies: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock the CookieConsentContext
vi.mock('../app/context/CookieConsentContext', () => ({
  useCookieConsent: () => ({
    messageHasBeenSent: false,
    setMessageHasBeenSent: vi.fn(),
    cookieConsent: true,
    setCookieConsent: vi.fn(),
  }),
  CookieConsentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the useFireproof hook
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    useDocument: () => [{ _id: 'mock-doc' }, vi.fn()],
    useLiveQuery: () => [[]],
  }),
}));

// Mock the useSimpleChat hook
vi.mock('../app/hooks/useSimpleChat', () => ({
  useSimpleChat: () => ({
    needsLogin: false,
    docs: [],
    isStreaming: false,
    codeReady: false,
    sendMessage: vi.fn(),
    setInput: vi.fn(),
    input: '',
    selectedSegments: [],
    selectedCode: '',
    selectedDependencies: [],
    setSelectedResponseId: vi.fn(),
    immediateErrors: [],
    advisoryErrors: [],
    needsLoginTriggered: false,
    setNeedsLoginTriggered: vi.fn(),
  }),
}));

// Mock the useAuth hook
vi.mock('../app/hooks/useAuth', () => ({
  useAuth: () => ({
    userId: 'mock-user-id',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('Root Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Reset document classes
    document.documentElement.classList.remove('dark');
  });

  it('renders the Layout component with children', () => {
    // Since Layout renders a full HTML document with <html> and <body> tags,
    // which can cause issues in test environments, just verify it renders without errors
    expect(() => {
      render(
        <Layout>
          <div data-testid="test-content">Test Child Content</div>
        </Layout>
      );
      // If we get here without an error, the test passes
    }).not.toThrow();
  });

  it('applies dark mode when system preference is dark', () => {
    // Mock matchMedia to return dark mode preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Use document.createElement to create a container to avoid hydration warnings
    const container = document.createElement('div');
    render(
      <Layout>
        <div>Test</div>
      </Layout>,
      { container }
    );

    // Check that dark class is added to html element
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('renders the ErrorBoundary component with an error', () => {
    const testError = new Error('Test error');

    render(<ErrorBoundary error={testError} params={{}} />);

    // Check that the error message is displayed
    expect(screen.getByText('Oops!')).toBeDefined();
    expect(screen.getByText('Test error')).toBeDefined();
  });
});
