import { render, screen } from '@testing-library/react';
import MessageList from '../app/components/MessageList';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import {
  debugLog,
  logStreamingUpdate,
  logSegmentDetails,
  logDOMVerification,
  resetStreamingUpdateCount,
} from '../app/utils/debugLogging';

// For direct stdout logging that bypasses Node's buffering
function writeToStdout(message: string) {
  process.stdout.write(`\n${message}\n`);
}

// Mock scrollIntoView
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  resetStreamingUpdateCount();

  // Force log at test startup
  writeToStdout('🔍 TEST STARTING: MessageList streaming tests');
});

// Mock the useSessionMessages hook for streaming tests
vi.mock('../app/hooks/useSessionMessages', () => ({
  useSessionMessages: vi.fn().mockImplementation((sessionId) => {
    if (sessionId === 'streaming-incremental') {
      // Force log the stream update directly to stdout
      writeToStdout('🔍 STREAM UPDATE: length=2 - content={"');

      // Return very minimal content first (just like real app)
      return {
        messages: [
          { type: 'user', text: 'Create a quiz app' },
          {
            type: 'ai',
            text: '{"',
            segments: [{ type: 'markdown', content: '{"' }],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-partial') {
      // Simulate a bit more content now, still just markdown
      const content = '{"dependencies": {}}\n\nThis quiz app allows users to create';
      writeToStdout(
        `🔍 STREAM UPDATE: length=${content.length} - content="${content.substring(0, 30)}..."`
      );

      return {
        messages: [
          { type: 'user', text: 'Create a quiz app' },
          {
            type: 'ai',
            text: content,
            segments: [{ type: 'markdown', content }],
            isStreaming: true,
          },
        ],
        isLoading: false,
      };
    } else if (sessionId === 'streaming-with-code') {
      // Simulate adding code segments like in the logs
      const markdownContent =
        '{"dependencies": {}}\n\nThis quiz app allows users to create quizzes with timed questions and track scores. Users can create new quizzes, add questions with multiple choice options, and then take quizzes to track their scores.';
      const codeContent = 'import React, { useState, use';

      writeToStdout(
        `🔍 STREAM UPDATE: length=${markdownContent.length + codeContent.length + 8} with code segment - markdown=${markdownContent.length} bytes, code=${codeContent.length} bytes`
      );
      writeToStdout(
        `🔍 SEGMENT 0: type=markdown, content="${markdownContent.substring(0, 30)}..."`
      );
      writeToStdout(`🔍 SEGMENT 1: type=code, content="${codeContent}"`);

      return {
        messages: [
          { type: 'user', text: 'Create a quiz app' },
          {
            type: 'ai',
            text: `${markdownContent}\n\n\`\`\`js\n${codeContent}`,
            segments: [
              { type: 'markdown', content: markdownContent },
              { type: 'code', content: codeContent },
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
    writeToStdout('🔍 TEST: should display minimal content at stream start');
    render(<MessageList sessionId="streaming-incremental" isStreaming={() => true} />);

    // Check if we see the minimal content in the DOM
    const messageContent = screen.queryByText(/\{\"/);
    writeToStdout(`Is minimal content "{" visible? ${messageContent ? 'YES' : 'NO'}`);

    // Log the DOM structure to see what's actually rendered
    const messageContainer = document.querySelector('[data-testid="message-1"]');
    if (messageContainer) {
      writeToStdout(
        `DOM content at start of stream: ${messageContainer.innerHTML.substring(0, 100)}...`
      );
    } else {
      writeToStdout('MESSAGE CONTAINER NOT FOUND - could be why content is not showing');
    }

    // This is what we want - but it might fail if the app has a bug
    expect(screen.getByText(/\{\"/)).toBeInTheDocument();
  });

  test('should update UI as more content streams in', () => {
    writeToStdout('🔍 TEST: should update UI as more content streams in');
    render(<MessageList sessionId="streaming-partial" isStreaming={() => true} />);

    // Check if we see the content
    const content = screen.queryByText(/This quiz app allows users to create/);
    writeToStdout(`Is partial content visible? ${content ? 'YES' : 'NO'}`);

    // Log what MessageList is deciding to render
    writeToStdout(
      `MessageList showTypingIndicator check - would return: ${!content ? 'SHOW TYPING' : 'SHOW CONTENT'}`
    );

    expect(screen.getByText(/This quiz app allows users to create/)).toBeInTheDocument();
  });

  test('should display both markdown and code when segments are present', () => {
    writeToStdout('🔍 TEST: should display both markdown and code when segments are present');
    render(<MessageList sessionId="streaming-with-code" isStreaming={() => true} />);

    // Check if we see both types of content
    const markdownContent = screen.queryByText(/This quiz app allows users/);
    const codeContent = screen.queryByText(/import React/);

    writeToStdout(`Markdown content visible? ${markdownContent ? 'YES' : 'NO'}`);
    writeToStdout(`Code content visible? ${codeContent ? 'YES' : 'NO'}`);

    if (markdownContent && codeContent) {
      writeToStdout('Both segments rendering correctly in test');
    } else {
      writeToStdout('SEGMENTS MISSING - same issue as in real app?');
    }

    expect(markdownContent).toBeInTheDocument();
    expect(codeContent).toBeInTheDocument();
  });
});
