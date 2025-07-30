import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWrapper } from './setup';

// --- Dynamic mocks for useApiKey ---------------------------
import * as ApiKeyModule from '../../app/hooks/useApiKey';

// Track mutable auth state between renders
let isAuthenticated = false;
const setNeedsLoginMock = vi.fn();

// Control refreshKey success / failure
let refreshKeySucceeds = true;
const refreshKeyMock = vi.fn(async () => {
  if (refreshKeySucceeds) {
    return { key: 'new-api-key', hash: 'new-hash' };
  }
  throw new Error('refreshKey failure (simulated)');
});

// Spy on useApiKey so we can inject our custom refreshKey
vi.spyOn(ApiKeyModule, 'useApiKey').mockImplementation(() => ({
  ensureApiKey: vi.fn(),
  refreshKey: refreshKeyMock,
}));

// Import the hook *after* mocks are set up
import { useSimpleChat } from '../../app/hooks/useSimpleChat';
import * as AuthModule from '../../app/contexts/AuthContext';

// ---------------------------------------------------------------------------

describe('useSimpleChat handlePostLogin effect', () => {
  beforeEach(() => {
    setNeedsLoginMock.mockReset();
    refreshKeyMock.mockClear();
    // Reset flags to default state
    isAuthenticated = false;
    refreshKeySucceeds = true;

    // Override the setup mock with our dynamic mock
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
    // Simulate refreshKey throwing BEFORE rendering the hook
    refreshKeySucceeds = false;
    // user is logged IN
    isAuthenticated = true;

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
