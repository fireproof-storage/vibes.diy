import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultPreview from '../../app/components/ResultPreview/ResultPreview';
import { mockResultPreviewProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('ResultPreview preview events', () => {
  it('receives preview-ready message from iframe when content loads', async () => {
    const previewReadyHandler = vi.fn();
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'preview-ready') {
        previewReadyHandler(event.data);
      }
    });
    const code = `function App() { return <div>Test App Content</div>; }`;
    const mockSetPreviewLoaded = vi.fn();
    const testProps = {
      ...mockResultPreviewProps,
      code,
      isStreaming: false,
      codeReady: true,
      onPreviewLoaded: mockSetPreviewLoaded,
    };
    render(
      <MockThemeProvider>
        <ResultPreview {...testProps} />
      </MockThemeProvider>
    );
    const previewReadyEvent = new MessageEvent('message', { data: { type: 'preview-ready' } });
    act(() => {
      window.dispatchEvent(previewReadyEvent);
    });
    await waitFor(() => {
      expect(previewReadyHandler).toHaveBeenCalledWith({ type: 'preview-ready' });
    });
    expect(mockSetPreviewLoaded).toHaveBeenCalled();
  });

  it('handles screenshot capture requests', () => {
    const onScreenshotCaptured = vi.fn();
    const code = `function App() { return <div>Hello World</div>; }`;
    render(
      <MockThemeProvider>
        <ResultPreview
          code={code}
          onScreenshotCaptured={onScreenshotCaptured}
          {...mockResultPreviewProps}
        />
      </MockThemeProvider>
    );
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'screenshot', data: 'base64-data' } })
      );
    });
    expect(onScreenshotCaptured).toHaveBeenCalledWith('base64-data');
  });

  it('handles preview loaded event', async () => {
    const onPreviewLoaded = vi.fn();
    const code = `function App() { return <div>Hello World</div>; }`;
    render(
      <MockThemeProvider>
        <ResultPreview code={code} {...mockResultPreviewProps} onPreviewLoaded={onPreviewLoaded} />
      </MockThemeProvider>
    );
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'preview-loaded' } }));
    });
    await waitFor(() => {
      expect(onPreviewLoaded).toHaveBeenCalled();
    });
  });
});
