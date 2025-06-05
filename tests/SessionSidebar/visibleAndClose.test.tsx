import { setMockAuthState } from './setup';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';

describe('SessionSidebar visibility and close', () => {
  it('renders sidebar correctly when visible', () => {
    const onClose = vi.fn();
    const props = { ...mockSessionSidebarProps, isVisible: true, onClose };
    const { container } = render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    const sidebarContainer = container.querySelector('div > div');
    expect(sidebarContainer).not.toHaveClass('-translate-x-full');
  });

  it('handles close button click', () => {
    const onClose = vi.fn();
    const props = { ...mockSessionSidebarProps, isVisible: true, onClose };
    render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const closeButton = screen.getByLabelText('Close sidebar');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes sidebar on mobile when clicking close button', () => {
    setMockAuthState({ isAuthenticated: true, isLoading: false });
    const onClose = vi.fn();
    const props = { ...mockSessionSidebarProps, isVisible: true, onClose };
    render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const closeButton = screen.getByLabelText('Close sidebar');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('is not visible when isVisible is false', () => {
    setMockAuthState({ isAuthenticated: true, isLoading: false });
    const props = { ...mockSessionSidebarProps, isVisible: false };
    render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    const sidebar = screen.getByTestId('session-sidebar');
    expect(sidebar).toHaveClass('-translate-x-full');
  });
});
