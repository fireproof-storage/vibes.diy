import { beforeEach, vi } from 'vitest';
import { mockUseAuth, resetMockAuthState } from '../../__mocks__/useAuth';

vi.mock('../../app/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../app/utils/auth', () => ({
  initiateAuthFlow: vi.fn(),
}));

vi.mock('../../app/utils/analytics', () => ({
  trackAuthClick: vi.fn(),
}));

import { initiateAuthFlow } from '../../app/utils/auth';
import { trackAuthClick } from '../../app/utils/analytics';

vi.mock('react-router', () => {
  const React = require('react');
  return {
    Link: vi.fn(({ to, children, onClick, ...props }) =>
      React.createElement(
        'a',
        { 'data-testid': 'router-link', href: to, onClick, ...props },
        children
      )
    ),
  };
});

const createObjectURLMock = vi.fn(() => 'mocked-url');
const revokeObjectURLMock = vi.fn();
Object.defineProperty(global.URL, 'createObjectURL', {
  value: createObjectURLMock,
  writable: true,
});
Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: revokeObjectURLMock,
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  resetMockAuthState();
  vi.mocked(initiateAuthFlow).mockClear();
  vi.mocked(trackAuthClick).mockClear();
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  document.body.innerHTML = '';
});

export { setMockAuthState } from '../../__mocks__/useAuth';
export { initiateAuthFlow, trackAuthClick };
