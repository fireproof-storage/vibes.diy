import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
import { mockResultPreviewProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('ResultPreview dependencies and display', () => {
  it('handles edge case with empty code', () => {
    const { container } = render(
      <MockThemeProvider>
        <ResultPreview code="" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    const { container } = render(
      <MockThemeProvider>
        <ResultPreview code="" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(container).toMatchSnapshot();
  });

  it('handles dependencies correctly', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    const dependencies = { react: '17.0.2', 'react-dom': '17.0.2' };
    render(
      <MockThemeProvider>
        <ResultPreview code={code} dependencies={dependencies} {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('displays code correctly', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    render(
      <MockThemeProvider>
        <ResultPreview code={code} {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });
});
