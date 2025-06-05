import { setMockAuthState } from './setup';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';

describe('SessionSidebar navigation items', () => {
  it('has navigation items rendered correctly', () => {
    setMockAuthState({ isAuthenticated: true, isLoading: false });
    const props = { ...mockSessionSidebarProps };
    render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const nav = document.querySelector('nav');
    expect(nav).toBeInTheDocument();
    const listItems = nav?.querySelectorAll('li');
    expect(listItems?.length).toBeGreaterThan(0);
    for (const li of Array.from(listItems || [])) {
      const linkOrButton = li.querySelector('a, button');
      expect(linkOrButton).toBeInTheDocument();
    }
  });
});
