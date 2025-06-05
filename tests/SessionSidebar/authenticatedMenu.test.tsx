import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import { setMockAuthState } from './setup';
import './setup';

describe('SessionSidebar', () => {
  it('should correctly render SessionSidebar component with menu items when authenticated', () => {
    setMockAuthState({ isAuthenticated: true, isLoading: false });
    const props = { ...mockSessionSidebarProps };
    render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    expect(screen.queryAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('My Vibes').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Settings').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('About').length).toBeGreaterThan(0);
    expect(screen.queryByText('Log in')).toBeNull();
  });
});
