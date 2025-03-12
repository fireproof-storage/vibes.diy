import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SandpackScrollController from '../app/components/ResultPreview/SandpackScrollController';

// Mock ResizeObserver since it's not available in the test environment
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-ignore - override the global ResizeObserver
global.ResizeObserver = MockResizeObserver;

// Mock DOM methods
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
});

Element.prototype.scrollTo = vi.fn();

describe('SandpackScrollController', () => {
  beforeEach(() => {
    // Setup DOM structure that SandpackScrollController would expect
    const rootDiv = document.createElement('div');
    rootDiv.className = 'sp-wrapper';

    const previewContainer = document.createElement('div');
    previewContainer.className = 'sp-preview-container';
    rootDiv.appendChild(previewContainer);

    document.body.appendChild(rootDiv);
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';

    // Remove the style element if it was added
    const styleElement = document.getElementById('highlight-style');
    if (styleElement) {
      styleElement.remove();
    }
  });

  it('renders without crashing', () => {
    render(<SandpackScrollController isStreaming={false} />);

    // Check that the highlight style is added
    const styleElement = document.getElementById('highlight-style');
    expect(styleElement).not.toBeNull();
  });

  it('renders with streaming enabled', () => {
    render(<SandpackScrollController isStreaming={true} />);

    // Component renders without errors
    const styleElement = document.getElementById('highlight-style');
    expect(styleElement).not.toBeNull();
  });

  it('adds highlight style to the document', () => {
    render(<SandpackScrollController isStreaming={false} />);

    const styleElement = document.getElementById('highlight-style');
    expect(styleElement).not.toBeNull();
    expect(styleElement?.textContent).toContain('.cm-line-highlighted');
  });
});
