import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionSidebar from '../app/components/SessionSidebar';

describe('SessionSidebar', () => {
  it('renders sidebar correctly when visible', () => {
    const onClose = vi.fn();
    const onSelectSession = vi.fn();

    render(<SessionSidebar isVisible={true} onClose={onClose} onSelectSession={onSelectSession} />);

    expect(screen.getByText('App History')).toBeDefined();
  });

  it('handles close button click', () => {
    const onClose = vi.fn();
    const onSelectSession = vi.fn();

    render(<SessionSidebar isVisible={true} onClose={onClose} onSelectSession={onSelectSession} />);

    const closeButton = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});
