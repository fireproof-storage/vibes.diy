import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
import { mockResultPreviewProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('ResultPreview', () => {
  it('renders without crashing', () => {
    render(
      <MockThemeProvider>
        <ResultPreview code="console.log('test');" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.getByTestId('sandpack-editor')).toBeInTheDocument();
  });

  it('displays welcome screen when code is empty', () => {
    const { container } = render(
      <MockThemeProvider>
        <ResultPreview code="" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });
});
