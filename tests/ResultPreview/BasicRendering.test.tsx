import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderResultPreview, useSharedViewStateMock, defaultMockState } from './setup';

describe('ResultPreview Basic Rendering', () => {
  // Reset mocks between tests
  beforeEach(() => {
    vi.clearAllMocks();
    window.postMessage = vi.fn();
    useSharedViewStateMock.mockReturnValue(defaultMockState);
  });

  it('displays the code editor initially', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    renderResultPreview({ code });

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('shows welcome screen when no code is provided', () => {
    const { container } = renderResultPreview({ code: '' });

    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('renders with a simple code snippet', () => {
    const code = 'const test = "Hello";';
    const setActiveView = vi.fn();

    renderResultPreview({
      code,
      dependencies: {},
      isStreaming: false,
      codeReady: true,
      activeView: 'code',
      setActiveView,
      onPreviewLoaded: () => {},
      setMobilePreviewShown: () => {},
    });

    expect(screen.getByTestId('sandpack-editor')).toBeDefined();
  });

  it('passes dependencies to Sandpack', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    const dependencies = {
      react: '17.0.2',
      'react-dom': '17.0.2',
    };
    renderResultPreview({ code, dependencies });

    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });
});
