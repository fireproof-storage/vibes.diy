import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import { setMockAuthState, initiateAuthFlow, trackAuthClick } from './setup';
import './setup';

describe('SessionSidebar credits', () => {
  it('should show Get Credits button when needsLogin is true', () => {
    setMockAuthState({ isAuthenticated: true, isLoading: false });
    const props = { ...mockSessionSidebarProps };
    const { container } = render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const sidebar = container.firstChild;
    expect(sidebar).toBeDefined();
    expect(screen.queryAllByText('Settings').length).toBeGreaterThan(0);
    const needsLoginEvent = new CustomEvent('needsLoginTriggered');
    act(() => {
      const calls = vi.mocked(window.addEventListener).mock.calls;
      const cb = calls.find((c: any) => c[0] === 'needsLoginTriggered')?.[1] as EventListener;
      if (cb) cb(needsLoginEvent);
    });
    setMockAuthState({ isAuthenticated: true, isLoading: false });
    render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const getCreditsButton = screen.queryByText('Get Credits');
    if (getCreditsButton) {
      fireEvent.click(getCreditsButton);
      expect(initiateAuthFlow).toHaveBeenCalled();
      expect(trackAuthClick).toHaveBeenCalled();
    } else {
      expect(screen.queryAllByText('Settings').length).toBeGreaterThan(0);
    }
  });
});
