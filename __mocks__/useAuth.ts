import { vi } from 'vitest';
import type { AuthContextType } from '../app/contexts/AuthContext';

// Default authenticated state
export const defaultAuthenticatedState: AuthContextType = {
  isAuthenticated: true,
  isLoading: false,
  token: 'mock-token',
  userPayload: {
    userId: 'test-user-id',
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

// Default unauthenticated state
export const defaultUnauthenticatedState: AuthContextType = {
  isAuthenticated: false,
  isLoading: false,
  token: null,
  userPayload: null,
  needsLogin: false,
  setNeedsLogin: vi.fn(),
  checkAuthStatus: vi.fn(),
  processToken: vi.fn(),
};

// Create a mock implementation that can be customized per test
export const mockUseAuth = vi.fn().mockImplementation(() => defaultAuthenticatedState);

// Export a function to easily update the mock state
export const setMockAuthState = (state: Partial<AuthContextType>) => {
  mockUseAuth.mockImplementation(() => ({
    ...defaultAuthenticatedState,
    needsLogin: false,
    setNeedsLogin: vi.fn(),
    ...state,
  }));
};

// Export a function to reset the mock to default state
export const resetMockAuthState = () => {
  mockUseAuth.mockImplementation(() => defaultAuthenticatedState);
};

// Export the mock for use in tests
export default {
  useAuth: mockUseAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
};
