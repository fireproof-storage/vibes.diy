import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWrapper } from './setup';

// --- Dynamic mocks for AuthContext and useApiKey ---------------------------
import * as AuthModule from '../../app/contexts/AuthContext';
import * as ApiKeyModule from '../../app/hooks/useApiKey';

// Track mutable auth state between renders
let isAuthenticated = false;
const setNeedsLoginMock = vi.fn();

// Spy on useAuth so we can control return values in each test
vi.spyOn(AuthModule, 'useAuth').mockImplementation(() => ({
  token: 'mock-token',
  isAuthenticated,
  isLoading: false,
  userPayload: {
    userId: 'test-user-id',
    exp: 0,
    iat: 0,
    iss: '',
    aud: '',
    tenants: [],
    ledgers: [],
  },
  needsLogin: !isAuthenticated,
  setNeedsLogin: setNeedsLoginMock,
  checkAuthStatus: vi.fn(),
  processToken: vi.fn(),
}));

// Control refreshKey success / failure
let refreshKeySucceeds = true;
const refreshKeyMock = vi.fn(async () => {
  if (refreshKeySucceeds) {
    return { key: 'new-api-key', hash: 'new-hash' };
  }
  throw new Error('refreshKey failure (simulated)');
});

// Spy on useApiKey so we can inject our custom refreshKey
vi.spyOn(ApiKeyModule, 'useApiKey').mockImplementation(
  () =>
    ({
      ensureApiKey: vi.fn(),
      refreshKey: refreshKeyMock,
    }) as any
);

// Import the hook *after* mocks are set up
import { useSimpleChat } from '../../app/hooks/useSimpleChat';

// ---------------------------------------------------------------------------

describe('useSimpleChat handlePostLogin effect', () => {
  beforeEach(() => {
    setNeedsLoginMock.mockReset();
    refreshKeyMock.mockClear();
  });

  afterEach(() => {
    // Reset auth flags between tests
    isAuthenticated = false;
    refreshKeySucceeds = true;
  });

  it('prompts for login when needsNewKey is true and user is not authenticated', async () => {
    // user starts logged OUT
    isAuthenticated = false;

    const { result } = renderHook(() => useSimpleChat('test-session-id'), {
      wrapper: createWrapper(),
    });

    // Trigger the effect by marking that we need a new key
    act(() => {
      result.current.setNeedsNewKey(true);
    });

    await waitFor(
      () => {
        expect(setNeedsLoginMock).toHaveBeenCalled();
        expect(setNeedsLoginMock.mock.calls[0][0]).toBe(true);
      },
      { timeout: 4000 }
    );
  });

  it('shows login again when refreshKey fails after authentication', async () => {
    // user is logged IN
    isAuthenticated = true;
    // Simulate refreshKey throwing
    refreshKeySucceeds = false;

    const { result } = renderHook(() => useSimpleChat('test-session-id'), {
      wrapper: createWrapper(),
    });

    // Need a new key
    act(() => {
      result.current.setNeedsNewKey(true);
    });

    await waitFor(
      () => {
        expect(setNeedsLoginMock).toHaveBeenCalled();
      },
      { timeout: 4000 }
    );
  });
});
