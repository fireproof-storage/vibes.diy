import './setup';
import { setMockAuthState } from './setup';
import { initiateAuthFlow } from '../../app/utils/auth';
import { trackAuthClick } from '../../app/utils/analytics';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';

describe('SessionSidebar login button', () => {
  it('should show Log in button when not authenticated', async () => {
    setMockAuthState({ isAuthenticated: false, isLoading: false, token: null, userPayload: null });
    const props = { ...mockSessionSidebarProps };
    const { container } = render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const sidebar = container.firstChild;
    expect(sidebar).toBeDefined();
    expect(screen.queryAllByText('Log in').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Settings').length).toBe(0);
    const loginButton = screen.getByText('Log in');
    await act(async () => {
      fireEvent.click(loginButton);
      await Promise.resolve();
    });
    expect(initiateAuthFlow).toHaveBeenCalledTimes(1);
    expect(trackAuthClick).toHaveBeenCalledTimes(1);
  });
});
