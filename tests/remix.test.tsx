import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '~/contexts/AuthContext';
import type { TokenPayload } from '~/utils/auth';
import Remix from '../app/routes/remix';

// Mock the Session hooks
vi.mock('../app/hooks/useSession', () => ({
  useSession: () => ({
    session: { _id: 'test-session-id' },
    sessionDatabase: {
      get: vi.fn().mockImplementation((id) => {
        if (id === 'vibe') {
          return Promise.resolve({ _id: 'vibe', created_at: Date.now() });
        }
        throw new Error('Not found');
      }),
      put: vi.fn().mockResolvedValue({ ok: true }),
    },
    updateTitle: vi.fn().mockResolvedValue(true),
  }),
}));

// Create a wrapper component with auth context
const renderWithAuthContext = (
  ui: React.ReactNode,
  { isAuthenticated = true, userId = 'test-user-id' } = {}
) => {
  const userPayload: TokenPayload | null = isAuthenticated
    ? {
        userId,
        exp: 9999999999,
        tenants: [],
        ledgers: [],
        iat: 1234567890,
        iss: 'FP_CLOUD',
        aud: 'PUBLIC',
      }
    : null;

  const authValue = {
    token: isAuthenticated ? 'test-token' : null,
    isAuthenticated,
    isLoading: false,
    userPayload,
    needsLogin: false,
    setNeedsLogin: vi.fn(),
    checkAuthStatus: vi.fn(() => Promise.resolve()),
    processToken: vi.fn(),
  };

  return render(<AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>);
};

// Mock the API Key hook
vi.mock('../app/hooks/useApiKey', () => ({
  useApiKey: () => ({
    apiKey: 'test-api-key',
  }),
}));

// Mock variables for React Router
const navigateMock = vi.fn();
let locationMock = { search: '?prompt=Make+it+pink', pathname: '/remix/test-app-slug' };

// Mock React Router
vi.mock('react-router', () => ({
  useParams: () => ({ vibeSlug: 'test-app-slug' }),
  useNavigate: () => navigateMock,
  useLocation: () => locationMock,
}));

// Mock fetch
global.fetch = vi.fn().mockImplementation((url) => {
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve('export default function App() { return <div>Test App</div>; }'),
  });
});

// Mock the utils
vi.mock('~/components/SessionSidebar/utils', () => ({
  encodeTitle: (title: string) => title,
}));

describe('Remix Route', () => {
  beforeEach(() => {
    // Reset mocks before each test
    navigateMock.mockReset();
  });

  it('should process vibe slug and navigate with prompt parameter', async () => {
    // Set up location with prompt parameter
    locationMock = { search: '?prompt=Make+it+pink', pathname: '/remix/test-app-slug' };

    renderWithAuthContext(<Remix />);
    // Verify loading screen is displayed
    expect(screen.getByText(/REMIXING TEST-APP-SLUG/i)).toBeInTheDocument();

    // Wait for the navigation to occur with the prompt parameter
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
      // Check that the URL contains the expected parts
      const callArg = navigateMock.mock.calls[0][0];
      expect(callArg).toContain('/chat/');
      expect(callArg).toContain('/app?prompt=Make');
    });
  });

  it('should handle missing prompt parameter correctly', async () => {
    // Set up location without prompt parameter
    locationMock = { search: '', pathname: '/remix/test-app-slug' };

    renderWithAuthContext(<Remix />);

    // Wait for the navigation to occur without prompt parameter
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith(expect.stringMatching(/\/chat\/.*\/.*\/app$/));
      expect(navigateMock).not.toHaveBeenCalledWith(expect.stringMatching(/\?prompt=/));
    });
  });
});
