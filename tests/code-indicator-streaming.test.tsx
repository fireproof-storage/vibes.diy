import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { AuthContext } from '../app/contexts/AuthContext';
import { MockThemeProvider } from './utils/MockThemeProvider';

// Reusable auth context value
const authValue = {
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  userPayload: {
    userId: 'test-user',
    exp: 9999999999,
    tenants: [],
    ledgers: [],
    iat: 1234567890,
    iss: 'FP_CLOUD',
    aud: 'PUBLIC',
  },
  needsLogin: false,
  setNeedsLogin: vi.fn(),
  checkAuthStatus: vi.fn(),
  processToken: vi.fn(),
};

// Mock the CookieConsentContext used by home.tsx
vi.mock('../app/contexts/CookieConsentContext', () => ({
  useCookieConsent: () => ({
    messageHasBeenSent: false,
    setMessageHasBeenSent: vi.fn(),
  }),
  CookieConsentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock AppLayout to ensure header areas render in tests
vi.mock('../app/components/AppLayout', () => ({
  __esModule: true,
  default: ({
    headerLeft,
    headerRight,
    chatPanel,
    previewPanel,
  }: {
    headerLeft?: React.ReactNode;
    headerRight?: React.ReactNode;
    chatPanel: React.ReactNode;
    previewPanel: React.ReactNode;
  }) => (
    <div>
      <div data-testid="header-left">{headerLeft}</div>
      <div data-testid="header-right">{headerRight}</div>
      <div data-testid="chat-panel">{chatPanel}</div>
      <div data-testid="preview-panel">{previewPanel}</div>
    </div>
  ),
}));

// Mock ChatInterface and ResultPreview to keep the tree simple
vi.mock('../app/components/ChatInterface', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-interface" />,
}));

vi.mock('../app/components/ResultPreview/ResultPreview', () => ({
  __esModule: true,
  default: () => <div data-testid="result-preview" />,
}));

// Mock ResultPreviewHeaderContent to expose the computed loading state directly
vi.mock('../app/components/ResultPreview/ResultPreviewHeaderContent', () => ({
  __esModule: true,
  default: ({ viewControls }: { viewControls: any }) => (
    <div data-testid="header-mock">
      <span data-testid="code-icon" data-loading={viewControls.code?.loading ? 'true' : 'false'} />
    </div>
  ),
}));

// Mock useSession used by ResultPreviewHeaderContent
vi.mock('../app/hooks/useSession', () => ({
  useSession: () => ({
    session: { publishedUrl: undefined, firehoseShared: false },
    docs: [],
    updatePublishedUrl: vi.fn(),
    updateFirehoseShared: vi.fn(),
  }),
}));

// Mock icons to surface isLoading via data attributes
vi.mock('../app/components/HeaderContent/SvgIcons', () => ({
  PreviewIcon: ({ className, isLoading }: { className?: string; isLoading?: boolean }) => (
    <span
      data-testid="preview-icon"
      data-loading={isLoading ? 'true' : 'false'}
      className={className}
    >
      Preview
    </span>
  ),
  CodeIcon: ({ className, isLoading }: { className?: string; isLoading?: boolean }) => (
    <span data-testid="code-icon" data-loading={isLoading ? 'true' : 'false'} className={className}>
      Code
    </span>
  ),
  DataIcon: ({ className }: { className?: string }) => (
    <span data-testid="data-icon" className={className}>
      Data
    </span>
  ),
  SettingsIcon: ({ className }: { className?: string }) => (
    <span data-testid="settings-icon" className={className}>
      Settings
    </span>
  ),
  BackArrowIcon: () => <span data-testid="back-arrow" />, 
}));

// Mock ViewControls to surface loading state reliably
vi.mock('../app/components/ResultPreview/ViewControls', () => ({
  ViewControls: ({
    viewControls,
    currentView,
  }: {
    viewControls: any;
    currentView: string;
  }) => (
    <div data-testid="view-controls" data-current-view={currentView}>
      <span data-testid="code-icon" data-loading={viewControls.code?.loading ? 'true' : 'false'} />
    </div>
  ),
}));

// Provide a minimal useSimpleChat mock that we can vary per test
const makeUseSimpleChat =
  (opts: { isStreaming: boolean; text: string; selectedCode?: string }) => () => ({
    docs: [{ type: 'user', text: 'Prompt' }],
    input: '',
    setInput: vi.fn(),
    isStreaming: opts.isStreaming,
    inputRef: { current: null },
    sendMessage: vi.fn(),
    selectedSegments: [],
    selectedCode: opts.selectedCode ? ({ type: 'code', content: opts.selectedCode } as any) : null,
    title: 'My App',
    sessionId: 'session-1',
    selectedResponseDoc: { type: 'ai', text: opts.text },
    codeReady: false,
    addScreenshot: vi.fn(),
    setSelectedResponseId: vi.fn(),
    immediateErrors: [],
    advisoryErrors: [],
    addError: vi.fn(),
    isEmpty: false,
  });

describe('Code indicator spinning during streaming in code segments', () => {
  beforeEach(() => {
    // no-op
  });

  it('spins while streaming inside a code fence', async () => {
    vi.doMock('../app/hooks/useSimpleChat', () => ({
      useSimpleChat: makeUseSimpleChat({
        isStreaming: true,
        text: 'Intro\n```jsx\nconst x=1;\n',
        selectedCode: 'const App = () => null',
      }),
    }));

    const { default: UnifiedSession } = await import('../app/routes/home');
    render(
      <MockThemeProvider>
        <MemoryRouter initialEntries={['/chat/session-1/My-App/app']}>
          <AuthContext.Provider value={authValue as any}>
            <UnifiedSession />
          </AuthContext.Provider>
        </MemoryRouter>
      </MockThemeProvider>
    );

    expect(await screen.findByTestId('code-icon')).toHaveAttribute('data-loading', 'true');
  });

  

  it('works with multiple code segments; spins only when the trailing one is open', async () => {
    // Two code blocks, the last one is incomplete => should spin
    vi.doMock('../app/hooks/useSimpleChat', () => ({
      useSimpleChat: makeUseSimpleChat({
        isStreaming: true,
        text: 'Text before.\n```js\nconsole.log(1)\n```\nMore text.\n```\npartial code...\n',
        selectedCode: 'const App = () => null',
      }),
    }));

    const { default: UnifiedSession } = await import('../app/routes/home');
    render(
      <MockThemeProvider>
        <MemoryRouter initialEntries={['/chat/session-1/My-App/app']}>
          <AuthContext.Provider value={authValue as any}>
            <UnifiedSession />
          </AuthContext.Provider>
        </MemoryRouter>
      </MockThemeProvider>
    );

    expect(await screen.findByTestId('code-icon')).toHaveAttribute('data-loading', 'true');
  });
});
