import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { AuthContextType } from '../../app/contexts/AuthContext';
import { vi } from 'vitest';

export const createAuthContextValue = (
  overrides: Partial<AuthContextType> = {}
): AuthContextType => ({
  token: null,
  isAuthenticated: false,
  isLoading: false,
  userPayload: null,
  needsLogin: false,
  setNeedsLogin: vi.fn(),
  checkAuthStatus: vi.fn(),
  processToken: vi.fn(),
  ...overrides,
});

export const renderWithAuth = (
  ui: ReactElement,
  authOverrides: Partial<AuthContextType> = {},
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const value = createAuthContextValue(authOverrides);

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    // Lazy require inside component body to ensure module fully initialized
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AuthContext } = require('../../app/contexts/AuthContext');
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };
  return { ...render(ui, { wrapper, ...options }), authValue: value };
};
