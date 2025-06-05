import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import { setMockAuthState } from './setup';
import './setup';

describe('SessionSidebar navigation link close', () => {
  it('has navigation links that call onClose when clicked', () => {
    setMockAuthState({ isAuthenticated: true, isLoading: false });
    const onClose = vi.fn();
    const props = { ...mockSessionSidebarProps, isVisible: true, onClose };
    render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const navLinks = screen.getAllByText(/My Vibes|Settings|About/);
    for (const link of navLinks) {
      fireEvent.click(link);
      expect(onClose).toHaveBeenCalled();
      onClose.mockClear();
    }
  });
});
