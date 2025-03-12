import { render, screen } from '@testing-library/react';
import MessageList from '../app/components/MessageList';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock scrollIntoView
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Create a custom logging function that writes directly to stdout
function debugLog(message: string) {
  process.stdout.write(`\n${message}\n`);
}

// Mock the useSessionMessages hook for streaming tests
vi.mock('../app/hooks/useSessionMessages', () => ({
  useSessionMessages: vi.fn().mockImplementation((sessionId) => {
    if (sessionId === 'streaming-incremental') {
      // Simulate realistic streaming updates - this mimics what we see in browser
      debugLog('🔍 STREAM UPDATE: length=2 - content={"');
      
      // Return very minimal content first (just like real app)
      return {
        messages: [
          { type: 'user', text: 'Create a quiz app' },
          {
            type: 'ai',
            text: '{"',
            segments: [
              { type: 'markdown', content: '{"' },
            ],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-partial') {
      // Simulate a bit more content now, still just markdown
      debugLog('🔍 STREAM UPDATE: length=58 - content reduced to "{"dependencies": {}}\n\nThis quiz app allows users to create"');
      
      return {
        messages: [
          { type: 'user', text: 'Create a quiz app' },
          {
            type: 'ai',
            text: '{"dependencies": {}}\n\nThis quiz app allows users to create',
            segments: [
              { type: 'markdown', content: '{"dependencies": {}}\n\nThis quiz app allows users to create' },
            ],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-with-code') {
      // Simulate adding code segments like in the logs
      debugLog('🔍 STREAM UPDATE: length=261 with code segment - markdown=206 bytes, code=29 bytes');
      
      return {
        messages: [
          { type: 'user', text: 'Create a quiz app' },
          {
            type: 'ai',
            text: '{"dependencies": {}}\n\nThis quiz app allows users to create quizzes with timed questions and track scores. Users can create new quizzes, add questions with multiple choice options, and then take quizzes to track their scores.\n\n```js\nimport React, { useState, use',
            segments: [
              { type: 'markdown', content: '{"dependencies": {}}\n\nThis quiz app allows users to create quizzes with timed questions and track scores. Users can create new quizzes, add questions with multiple choice options, and then take quizzes to track their scores.' },
              { type: 'code', content: 'import React, { useState, use' },
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

describe('MessageList Real-World Streaming Tests', () => {
  test('should display minimal content at stream start', () => {
    render(<MessageList sessionId="streaming-incremental" isStreaming={() => true} />);
    
    // Check if we see the minimal content in the DOM
    const messageContent = screen.queryByText(/\{\"/);
    debugLog(`Is minimal content "{" visible? ${messageContent ? 'YES' : 'NO'}`);
    
    // Log the DOM structure to see what's actually rendered
    const messageContainer = document.querySelector('[data-testid="message-1"]');
    if (messageContainer) {
      debugLog(`DOM content at start of stream: ${messageContainer.innerHTML.substring(0, 100)}...`);
    } else {
      debugLog('MESSAGE CONTAINER NOT FOUND - could be why content is not showing');
    }
    
    // This is what we want - but it might fail if the app has a bug
    expect(screen.getByText(/\{\"/)).toBeInTheDocument();
  });

  test('should update UI as more content streams in', () => {
    render(<MessageList sessionId="streaming-partial" isStreaming={() => true} />);
    
    // Check if we see the content
    const content = screen.queryByText(/This quiz app allows users to create/);
    debugLog(`Is partial content visible? ${content ? 'YES' : 'NO'}`);
    
    // Log what MessageList is deciding to render
    debugLog(`MessageList showTypingIndicator check - would return: ${!content ? 'SHOW TYPING' : 'SHOW CONTENT'}`);
    
    expect(screen.getByText(/This quiz app allows users to create/)).toBeInTheDocument();
  });

  test('should display both markdown and code when segments are present', () => {
    render(<MessageList sessionId="streaming-with-code" isStreaming={() => true} />);
    
    // Check if we see both types of content
    const markdownContent = screen.queryByText(/This quiz app allows users/);
    const codeContent = screen.queryByText(/import React/);
    
    debugLog(`Markdown content visible? ${markdownContent ? 'YES' : 'NO'}`);
    debugLog(`Code content visible? ${codeContent ? 'YES' : 'NO'}`);
    
    if (markdownContent && codeContent) {
      debugLog('Both segments rendering correctly in test');
    } else {
      debugLog('SEGMENTS MISSING - same issue as in real app?');
    }
    
    expect(markdownContent).toBeInTheDocument();
    expect(codeContent).toBeInTheDocument();
  });
}); 