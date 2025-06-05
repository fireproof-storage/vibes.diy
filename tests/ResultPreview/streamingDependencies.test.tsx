import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
import { mockResultPreviewProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('ResultPreview streaming', () => {
  it('handles streaming state correctly', () => {
    const code = 'const test = "Streaming";';
    render(
      <MockThemeProvider>
        <ResultPreview code={code} isStreaming {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });

  it('passes dependencies to SandpackProvider', () => {
    const code = 'console.log("test");';
    const dependencies = { react: '^18.0.0', 'react-dom': '^18.0.0' };
    render(
      <MockThemeProvider>
        <ResultPreview code={code} dependencies={dependencies} {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.getAllByTestId('sandpack-provider')[0]).toBeDefined();
  });
});
