import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionSidebar from '../app/components/SessionSidebar';

describe('SessionSidebar', () => {
  it('renders sidebar correctly when visible', () => {
    const onToggle = vi.fn();
    const onSelectSession = vi.fn();

    render(
      <SessionSidebar isVisible={true} onToggle={onToggle} onSelectSession={onSelectSession} />
    );

    expect(screen.getByText('App History')).toBeDefined();
  });

  it('handles toggle button click', () => {
    const onToggle = vi.fn();
    const onSelectSession = vi.fn();

    render(
      <SessionSidebar isVisible={true} onToggle={onToggle} onSelectSession={onSelectSession} />
    );

    const closeButton = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeButton);

    expect(onToggle).toHaveBeenCalled();
  });
});
