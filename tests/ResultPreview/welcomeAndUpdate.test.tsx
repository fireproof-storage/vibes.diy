import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
import { mockResultPreviewProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('ResultPreview welcome and update', () => {
  it('shows welcome screen for empty code', () => {
    const { container } = render(
      <MockThemeProvider>
        <ResultPreview code="" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('renders code properly', () => {
    render(
      <MockThemeProvider>
        <ResultPreview code="console.log('test');" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('handles code updates correctly', () => {
    const { rerender } = render(
      <MockThemeProvider>
        <ResultPreview code="" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    rerender(
      <MockThemeProvider>
        <ResultPreview code="console.log('test');" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });
});
