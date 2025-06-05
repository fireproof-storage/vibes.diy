import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
import { mockResultPreviewProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('ResultPreview API key and initial view', () => {
  it('passes API key to iframe when preview-ready message is received', async () => {
    const mockIframe = { contentWindow: { postMessage: vi.fn() } } as any;
    const originalQuerySelector = document.querySelector;
    document.querySelector = vi.fn().mockImplementation((selector) => {
      if (selector === 'iframe') return mockIframe;
      return originalQuerySelector(selector);
    });
    vi.mock('../app/config/env', () => ({ CALLAI_API_KEY: 'test-api-key-12345' }));
    const code = `function App() { return <div>API Key Test</div>; }`;
    render(
      <MockThemeProvider>
        <ResultPreview code={code} codeReady {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'preview-ready' } }));
    });
    await waitFor(() => {
      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        { type: 'callai-api-key', key: expect.any(String) },
        '*'
      );
    });
    document.querySelector = originalQuerySelector;
  });

  it('displays the code editor initially', () => {
    const code = `function App() { return <div>Hello World</div>; }`;
    render(
      <MockThemeProvider>
        <ResultPreview code={code} {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(screen.queryByText(/Welcome to the preview/i)).not.toBeInTheDocument();
  });

  it('shows welcome screen when no code is provided', () => {
    const { container } = render(
      <MockThemeProvider>
        <ResultPreview code="" {...mockResultPreviewProps} />
      </MockThemeProvider>
    );
    expect(container.querySelector('div.h-full > div.h-full')).toBeInTheDocument();
  });

  it('renders with a simple code snippet', () => {
    const code = 'const test = "Hello";';
    render(
      <MockThemeProvider>
        <ResultPreview
          code={code}
          dependencies={{}}
          isStreaming={false}
          codeReady
          displayView="code"
          onPreviewLoaded={() => {}}
          setMobilePreviewShown={() => {}}
        />
      </MockThemeProvider>
    );
    expect(screen.getByTestId('sandpack-editor')).toBeDefined();
  });
});
