import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextType } from '../app/contexts/AuthContext';
import { AuthContext } from '../app/contexts/AuthContext';
import * as useSimpleChatModule from '../app/hooks/useSimpleChat';
import Space from '../app/routes/space';
import type { ChatState, Segment } from '../app/types/chat';
import { mockChatStateProps } from './mockData';

// Mock the CookieConsentContext
vi.mock('../app/contexts/CookieConsentContext', () => ({
  useCookieConsent: () => ({
    messageHasBeenSent: false,
    setMessageHasBeenSent: vi.fn(),
  }),
  CookieConsentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock other dependencies like useSimpleChat, useSession, etc. as needed
vi.mock('../app/hooks/useSimpleChat');
vi.mock('../app/utils/segmentParser');

// Mock react-router-dom
const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({
      spaceId: 'test-session-id',
      prefixUserId: '~test-user', // Add this to prevent redirection
    }),
    useNavigate: () => navigateMock,
    useLocation: () => ({
      search: '',
      pathname: '/space/test-session-id',
    }),
  };
});

vi.mock('../app/components/AppLayout', () => ({
  default: ({
    children,
    chatPanel,
    previewPanel,
  }: {
    children?: React.ReactNode;
    chatPanel?: React.ReactNode;
    previewPanel?: React.ReactNode;
  }) => (
    <div data-testid="mock-app-layout">
      {chatPanel}
      {previewPanel}
    </div>
  ),
}));

vi.mock('../app/components/ChatInterface', () => ({
  default: (props: Record<string, unknown>) => <div data-testid="mock-chat-interface" />,
}));

vi.mock('../app/components/ResultPreview/ResultPreview', () => ({
  default: (props: Record<string, unknown>) => <div data-testid="mock-result-preview" />,
}));

// Mock Fireproof
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    useAllDocs: () => ({ docs: [] }),
  }),
}));

// Mock SimpleAppLayout component
vi.mock('../app/components/SimpleAppLayout', () => ({
  default: ({
    headerLeft,
    children,
  }: {
    headerLeft: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="simple-app-layout">
      <div data-testid="header-left">{headerLeft}</div>
      <div data-testid="content-area">{children}</div>
    </div>
  ),
}));

// Define a wrapper component providing controlled context value and MemoryRouter
const createWrapper = (
  initialEntries = ['/space/test-session-id'],
  contextValue?: Partial<AuthContextType>
) => {
  const defaultContextValue: AuthContextType = {
    token: null,
    isAuthenticated: false,
    isLoading: false,
    userPayload: null,
    checkAuthStatus: vi.fn(),
    processToken: vi.fn(),
  };
  const valueToProvide = { ...defaultContextValue, ...contextValue };
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={valueToProvide}>
        <Routes>
          {/* Adjust path if needed based on actual route structure */}
          <Route path="/space/:spaceId" element={children} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('Space Route Integration', () => {
  const authenticatedState: Partial<AuthContextType> = {
    isAuthenticated: true,
    isLoading: false,
    userPayload: {
      userId: 'test',
      exp: 9999999999,
      tenants: [],
      ledgers: [],
      iat: 1234567890,
      iss: 'FP_CLOUD',
      aud: 'PUBLIC',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock useSimpleChat return value for this suite
    vi.mocked(useSimpleChatModule.useSimpleChat).mockReturnValue({
      ...mockChatStateProps,
      docs: [],
      input: '',
      setInput: vi.fn(),
      isStreaming: false,
      sendMessage: vi.fn(),
      selectedSegments: [] as Segment[],
      selectedCode: undefined,
      selectedDependencies: {},
      title: '',
      sessionId: 'test-session-id',
      inputRef: { current: null },
      needsNewKey: false,
      needsLogin: false,
      immediateErrors: [],
      advisoryErrors: [],
    } as unknown as ChatState);
  });

  it.skip('displays the correct components in the space view', async () => {
    const wrapper = createWrapper(['/~test-user'], authenticatedState);
    render(<Space />, { wrapper });

    // Check our SimpleAppLayout is rendered
    expect(screen.getByTestId('simple-app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('content-area')).toBeInTheDocument();
  });

  it.skip('should provide a share button that copies link to clipboard', async () => {
    const wrapper = createWrapper(['/~test-user'], authenticatedState);
    render(<Space />, { wrapper });
    // Add assertions relevant to Space component, e.g. finding share button
    // Note: Share button might be inside the mocked ResultPreview
    // Depending on implementation, might need to adjust mocks/assertions
  });
});
