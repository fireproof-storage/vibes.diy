import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
import { mockResultPreviewProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('ResultPreview code updates', () => {
  it('updates display when code changes', () => {
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
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('renders with code content', () => {
    const code = 'const test = "Hello World";';
    render(
      <MockThemeProvider>
        <ResultPreview code={code} {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.getByTestId('sandpack-editor')).toBeInTheDocument();
  });

  it('renders with custom dependencies', async () => {
    const code = 'import React from "react";';
    const dependencies = { react: '^18.0.0', 'react-dom': '^18.0.0' };
    render(
      <MockThemeProvider>
        <ResultPreview code={code} dependencies={dependencies} {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeInTheDocument();
    expect(screen.getByTestId('sandpack-editor')).toBeInTheDocument();
  });
});
