import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NeobrutalistSaveButton } from '../app/components/ResultPreview/NeobrutalistSaveButton';

describe('NeobrutalistSaveButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe('Rendering behavior', () => {
    it('should not render when hasChanges is false', () => {
      const { container } = render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when hasChanges is true', () => {
      render(<NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} />);

      // Should render both desktop and mobile versions
      expect(screen.getAllByRole('button', { name: /save/i })).toHaveLength(2);
    });
  });

  describe('Save state (no errors)', () => {
    it('should show "Save" text on desktop version', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={0} />
      );

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should have neobrutalism styling when no errors', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={0} />
      );

      const button = screen.getByText('Save').closest('button');
      expect(button).toHaveClass('border-2', 'border-border', 'shadow-[var(--shadow-shadow)]');
      expect(button).not.toBeDisabled();
    });

    it('should call onClick when clicked and no errors', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={0} />
      );

      const button = screen.getByText('Save');
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error state', () => {
    it('should show singular error message for 1 error', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={1} />
      );

      expect(screen.getByText('1 Error')).toBeInTheDocument();
    });

    it('should show plural error message for multiple errors', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={3} />
      );

      expect(screen.getByText('3 Errors')).toBeInTheDocument();
    });

    it('should have destructive styling when errors exist', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={2} />
      );

      const button = screen.getByText('2 Errors').closest('button');
      expect(button).toHaveClass('bg-red-500');
      expect(button).toBeDisabled();
    });

    it('should not call onClick when clicked and has errors', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={2} />
      );

      const button = screen.getByText('2 Errors');
      fireEvent.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Responsive behavior', () => {
    it('should render both desktop and mobile versions', () => {
      render(<NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} />);

      const buttons = screen.getAllByRole('button', { name: /save/i });
      expect(buttons).toHaveLength(2);

      // Desktop version should have "Save" text
      expect(screen.getByText('Save')).toBeInTheDocument();

      // Both should have MinidiscIcon (SVG elements)
      const icons = buttons.filter((button) => button.querySelector('svg'));
      expect(icons.length).toBe(2);
    });

    it('should show error count in mobile tooltip when has errors', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={3} />
      );

      const buttons = screen.getAllByRole('button');
      const mobileButton = buttons.find((button) => button.title?.includes('3 syntax errors'));
      expect(mobileButton).toBeInTheDocument();
    });

    it('should show singular error in mobile tooltip for 1 error', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={1} />
      );

      const buttons = screen.getAllByRole('button');
      const mobileButton = buttons.find((button) => button.title?.includes('1 syntax error'));
      expect(mobileButton).toBeInTheDocument();
    });
  });

  describe('Neobrutalism styling', () => {
    it('should have signature neobrutalism classes', () => {
      render(<NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} />);

      const button = screen.getByText('Save').closest('button');
      expect(button).toHaveClass(
        'border-2',
        'border-border',
        'shadow-[var(--shadow-shadow)]',
        'rounded-[--radius-base]'
      );
    });

    it('should have active state classes for button press effect', () => {
      render(<NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} />);

      const button = screen.getByText('Save').closest('button');
      expect(button).toHaveClass(
        'active:translate-x-boxShadowX',
        'active:translate-y-boxShadowY',
        'active:shadow-none'
      );
    });
  });

  describe('Props validation', () => {
    it('should handle undefined syntaxErrorCount', () => {
      render(<NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should handle zero syntaxErrorCount explicitly', () => {
      render(
        <NeobrutalistSaveButton onClick={mockOnClick} hasChanges={true} syntaxErrorCount={0} />
      );

      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });
});
