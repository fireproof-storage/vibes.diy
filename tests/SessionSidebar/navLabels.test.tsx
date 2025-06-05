import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('SessionSidebar navigation labels', () => {
  it('should render navigation links with correct labels', () => {
    const props = { ...mockSessionSidebarProps };
    const { container } = render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const sidebar = container.firstChild;
    expect(sidebar).toBeDefined();
    expect(screen.queryAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('My Vibes').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Settings').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('About').length).toBeGreaterThan(0);
  });
});
