// Vitest will automatically use mocks from __mocks__ directory
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionSidebar from '../app/components/SessionSidebar';
import { mockSessionSidebarProps } from './mockData';

// Mock Link component from react-router
vi.mock('react-router', () => {
  const React = require('react');
  return {
    Link: vi.fn(({ to, children, onClick, ...props }: any) => {
      // Use React.createElement instead of JSX
      return React.createElement(
        'a',
        {
          'data-testid': 'router-link',
          href: to,
          onClick: onClick,
          ...props,
        },
        children
      );
    }),
  };
});

// Set up createObjectURL mock so we can track calls
const createObjectURLMock = vi.fn(() => 'mocked-url');
const revokeObjectURLMock = vi.fn();

// Override URL methods
Object.defineProperty(global.URL, 'createObjectURL', {
  value: createObjectURLMock,
  writable: true,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: revokeObjectURLMock,
  writable: true,
});

describe('SessionSidebar', () => {
  beforeEach(() => {
    // Reset mocks and DOM before each test
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders sidebar correctly when visible', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />
    );

    // Check that the menu items are rendered
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Vibes')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();

    // The sidebar is the first div within the container that has position fixed
    const sidebarContainer = container.querySelector('div > div'); // First div inside the container div
    expect(sidebarContainer).not.toHaveClass('-translate-x-full');
  });

  it('handles close button click', () => {
    const onClose = vi.fn();
    render(<SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />);

    const closeButton = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('handles sidebar navigation links', () => {
    const onClose = vi.fn();
    render(<SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />);

    // Find all navigation links
    const homeLink = screen.getByText('Home').closest('a');
    const myVibesLink = screen.getByText('My Vibes').closest('a');
    const settingsLink = screen.getByText('Settings').closest('a');
    const aboutLink = screen.getByText('About').closest('a');

    // Check that the links have the right URLs
    expect(homeLink).toHaveAttribute('href', '/');
    expect(myVibesLink).toHaveAttribute('href', '/vibes/mine');
    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(aboutLink).toHaveAttribute('href', '/about');
  });

  it('closes sidebar on mobile when clicking close button', () => {
    const onClose = vi.fn();

    // Mock window.innerWidth to simulate mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500, // Mobile width
    });

    render(<SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />);

    // Find and click the close button
    const closeButton = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeButton);

    // Check that onClose was called
    expect(onClose).toHaveBeenCalled();

    // Reset window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('is not visible when isVisible is false', () => {
    const onClose = vi.fn();

    // Render with isVisible=false
    const { container } = render(
      <SessionSidebar isVisible={false} onClose={onClose} {...mockSessionSidebarProps} />
    );

    // Check that the sidebar has the -translate-x-full class to move it off screen
    const invisibleSidebar = container.querySelector('.-translate-x-full');
    expect(invisibleSidebar).not.toBeNull();

    // Also check that it has w-0 class to hide it
    expect(invisibleSidebar?.classList.toString()).toContain('w-0');
  });

  it('has navigation items rendered correctly', () => {
    const onClose = vi.fn();

    // We need to wrap this in act because it might cause state updates
    act(() => {
      render(<SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />);
    });

    // Verify that the navigation menu is rendered
    const homeLink = screen.getByText('Home');
    const myVibesLink = screen.getByText('My Vibes');
    const settingsLink = screen.getByText('Settings');
    const aboutLink = screen.getByText('About');

    expect(homeLink).toBeInTheDocument();
    expect(myVibesLink).toBeInTheDocument();
    expect(settingsLink).toBeInTheDocument();
    expect(aboutLink).toBeInTheDocument();
  });

  it('has navigation links that call onClose when clicked', () => {
    const onClose = vi.fn();
    render(<SessionSidebar isVisible={true} onClose={onClose} {...mockSessionSidebarProps} />);

    // Find one of the navigation links
    const homeLink = screen.getByText('Home').closest('a');

    // Click the link and verify onClose is called
    fireEvent.click(homeLink!);
    expect(onClose).toHaveBeenCalled();
  });
});
