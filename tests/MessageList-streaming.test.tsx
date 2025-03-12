import { render, screen } from '@testing-library/react';
import MessageList from '../app/components/MessageList';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock scrollIntoView
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Mock the useSessionMessages hook for streaming tests
vi.mock('../app/hooks/useSessionMessages', () => ({
  useSessionMessages: vi.fn().mockImplementation((sessionId) => {
    if (sessionId === 'streaming-early-markdown') {
      // Simulate a streaming message with just a few characters of markdown content
      return {
        messages: [
          { type: 'user', text: 'Create a React app' },
          {
            type: 'ai',
            text: 'Here',
            segments: [{ type: 'markdown', content: 'Here' }],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-markdown-and-code') {
      // Simulate a streaming message with both markdown and code segments
      return {
        messages: [
          { type: 'user', text: 'Create a todo app' },
          {
            type: 'ai',
            text: 'Here is a todo app\n\n```jsx\nimport React from "react";\n```',
            segments: [
              { type: 'markdown', content: 'Here is a todo app' },
              { type: 'code', content: 'import React from "react";' },
            ],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-just-code') {
      // Simulate a streaming message with only code segment
      return {
        messages: [
          { type: 'user', text: 'Give me code' },
          {
            type: 'ai',
            text: '```jsx\nimport React from "react";\n```',
            segments: [
              { type: 'code', content: 'import React from "react";' },
            ],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-no-content') {
      // Simulate a streaming message with no content (should show "Thinking...")
      return {
        messages: [
          { type: 'user', text: 'Create a React app' },
          {
            type: 'ai',
            text: '',
            segments: [],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else {
      return {
        messages: [],
        isLoading: true,
      };
    }
  }),
}));

describe('MessageList Streaming Content', () => {
  test('shows minimal markdown content during early streaming', () => {
    render(<MessageList sessionId="streaming-early-markdown" isStreaming={() => true} />);

    // Should show the minimal markdown content
    expect(screen.getByText('Here')).toBeInTheDocument();
    
    // Should NOT show "Thinking..." when there's content
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
  });

  test('shows both markdown and code content during streaming', () => {
    render(<MessageList sessionId="streaming-markdown-and-code" isStreaming={() => true} />);

    // Should show the markdown content
    expect(screen.getByText('Here is a todo app')).toBeInTheDocument();
    
    // Code should also be present (but we don't test the exact UI as it may vary)
    expect(screen.queryByText(/import React from "react";/)).toBeInTheDocument();
    
    // Should NOT show "Thinking..." when there's content
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
  });

  test('shows just code content during streaming if only code segment exists', () => {
    render(<MessageList sessionId="streaming-just-code" isStreaming={() => true} />);
    
    // Code should be present (but we don't test the exact UI as it may vary)
    expect(screen.queryByText(/import React from "react";/)).toBeInTheDocument();
    
    // Should NOT show "Thinking..." when there's content
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
  });

  test('shows "Processing response..." when no segments are available', () => {
    render(<MessageList sessionId="streaming-no-content" isStreaming={() => true} />);
    
    // Should show "Processing response..." when there's no content
    expect(screen.getByText('Processing response...')).toBeInTheDocument();
  });
}); 