import { render, screen } from '@testing-library/react';
import MessageList from '../app/components/MessageList';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock scrollIntoView
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  
  // Log MessageList props for debugging
  console.log = vi.fn(console.log);
});

// Mock the useSessionMessages hook for streaming tests
vi.mock('../app/hooks/useSessionMessages', () => ({
  useSessionMessages: vi.fn().mockImplementation((sessionId) => {
    if (sessionId === 'very-early-streaming') {
      // Simulate the very beginning of streaming with just JSON metadata
      return {
        messages: [
          { type: 'user', text: 'Create a todo app' },
          {
            type: 'ai',
            text: '{"dependencies": {}}',
            segments: [
              { type: 'markdown', content: '{"dependencies": {}}' },
            ],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-partial-message') {
      // Simulate partial message similar to what we see in browser logs
      return {
        messages: [
          { type: 'user', text: 'Create a todo app' },
          {
            type: 'ai',
            text: '{"dependencies": {}}\n\nHere\'s a Todo App with',
            segments: [
              { type: 'markdown', content: '{"dependencies": {}}\n\nHere\'s a Todo App with' },
            ],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-with-code-start') {
      // Simulate getting to the point where code segment starts appearing
      return {
        messages: [
          { type: 'user', text: 'Create a todo app' },
          {
            type: 'ai',
            text: '{"dependencies": {}}\n\nHere\'s a Todo App with due dates:\n\n```jsx\nimport React',
            segments: [
              { type: 'markdown', content: '{"dependencies": {}}\n\nHere\'s a Todo App with due dates:' },
              { type: 'code', content: 'import React' },
            ],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else {
      return {
        messages: [],
        isLoading: false,
      };
    }
  }),
}));

describe('MessageList Very Early Streaming', () => {
  test('shows content instead of "Thinking" even with just metadata', () => {
    render(<MessageList sessionId="very-early-streaming" isStreaming={() => true} />);
    
    // Get the content that we want to inspect
    const content = screen.getByText(/{"dependencies": {}}/).textContent;
    
    // Write directly to stdout to bypass console filtering
    process.stdout.write(`\n==DEBUG== Found metadata content: ${content}\n`);
    
    // Should show the content (json metadata) instead of "Thinking..."
    expect(screen.getByText(/{"dependencies": {}}/)).toBeInTheDocument();
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
    
    // Also check the DOM structure to see what we're rendering
    const allElements = document.body.innerHTML;
    process.stdout.write(`\n==DEBUG== DOM structure:\n${allElements.substring(0, 500)}...\n`);
  });

  test('shows partial markdown during streaming', () => {
    render(<MessageList sessionId="streaming-partial-message" isStreaming={() => true} />);
    
    // Should show the markdown content
    expect(screen.getByText(/Here's a Todo App with/)).toBeInTheDocument();
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
  });

  test('shows markdown when code segments start appearing', () => {
    render(<MessageList sessionId="streaming-with-code-start" isStreaming={() => true} />);
    
    // Get the markdown content
    const markdownEl = screen.getByText(/Here's a Todo App with due dates:/);
    const markdownContent = markdownEl.textContent;
    
    // Get the code content
    const codeEl = screen.getByText(/import React/);
    const codeContent = codeEl.textContent;
    
    // Write directly to stdout to bypass console filtering
    process.stdout.write(`\n==DEBUG== Markdown content: ${markdownContent}\n`);
    process.stdout.write(`\n==DEBUG== Code content: ${codeContent}\n`);
    
    // Also check if StructuredMessage is rendering properly
    const messageContainer = document.querySelector('[data-testid="message-1"]');
    if (messageContainer) {
      process.stdout.write(`\n==DEBUG== Message structure:\n${messageContainer.innerHTML.substring(0, 500)}...\n`);
    }
    
    // Should show the markdown part
    expect(screen.getByText(/Here's a Todo App with due dates:/)).toBeInTheDocument();
    
    // And should also show the code part
    expect(screen.getByText(/import React/)).toBeInTheDocument();
    
    // Should not show "Thinking..."
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
  });
}); 