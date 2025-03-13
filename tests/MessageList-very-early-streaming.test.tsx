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
import type { UserChatMessage, AiChatMessage } from '../app/types/chat';

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

// Mock the Message component to match real implementation
vi.mock('../app/components/Message', () => ({
  default: ({ message }: any) => (
    <div data-testid={`message-${message._id}`}>
      {message.segments &&
        message.segments.map((segment: any, i: number) => (
          <div key={i} data-testid={segment.type}>
            {segment.content}
          </div>
        ))}
      {message.text && !message.segments?.length && <div>{message.text}</div>}
    </div>
  ),
  WelcomeScreen: () => <div data-testid="welcome-screen">Welcome Screen</div>,
}));

describe('MessageList Real-World Streaming Tests', () => {
  test('should display minimal content at stream start', () => {
    writeToStdout('🔍 TEST: should display minimal content at stream start');

    const messages = [
      {
        type: 'user',
        text: 'Create a quiz app',
        _id: 'user-1',
        session_id: 'test-session',
        created_at: Date.now(),
      } as UserChatMessage,
      {
        type: 'ai',
        text: '{"',
        _id: '1',
        segments: [{ type: 'markdown', content: '{"' }],
        isStreaming: true,
        session_id: 'test-session',
        created_at: Date.now(),
      } as AiChatMessage,
    ];

    render(<MessageList messages={messages} isStreaming={true} />);

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

    const content = '{"dependencies": {}}\n\nThis quiz app allows users to create';
    writeToStdout(
      `🔍 STREAM UPDATE: length=${content.length} - content="${content.substring(0, 30)}..."`
    );

    const messages = [
      {
        type: 'user',
        text: 'Create a quiz app',
        _id: 'user-2',
        session_id: 'test-session',
        created_at: Date.now(),
      } as UserChatMessage,
      {
        type: 'ai',
        text: content,
        _id: '2',
        segments: [{ type: 'markdown', content }],
        isStreaming: true,
        session_id: 'test-session',
        created_at: Date.now(),
      } as AiChatMessage,
    ];

    render(<MessageList messages={messages} isStreaming={true} />);

    // Check if we see the content
    const contentElement = screen.queryByText(/This quiz app allows users to create/);
    writeToStdout(`Is partial content visible? ${contentElement ? 'YES' : 'NO'}`);

    // Log what MessageList is deciding to render
    writeToStdout(
      `MessageList showTypingIndicator check - would return: ${!contentElement ? 'SHOW TYPING' : 'SHOW CONTENT'}`
    );

    expect(screen.getByText(/This quiz app allows users to create/)).toBeInTheDocument();
  });

  test('should display both markdown and code when segments are present', () => {
    writeToStdout('🔍 TEST: should display both markdown and code when segments are present');

    const markdownContent =
      '{"dependencies": {}}\n\nThis quiz app allows users to create quizzes with timed questions and track scores. Users can create new quizzes, add questions with multiple choice options, and then take quizzes to track their scores.';
    const codeContent = 'import React, { useState, use';

    writeToStdout(
      `🔍 STREAM UPDATE: length=${markdownContent.length + codeContent.length + 8} with code segment - markdown=${markdownContent.length} bytes, code=${codeContent.length} bytes`
    );
    writeToStdout(`🔍 SEGMENT 0: type=markdown, content="${markdownContent.substring(0, 30)}..."`);
    writeToStdout(`🔍 SEGMENT 1: type=code, content="${codeContent}"`);

    const messages = [
      {
        type: 'user',
        text: 'Create a quiz app',
        _id: 'user-3',
        session_id: 'test-session',
        created_at: Date.now(),
      } as UserChatMessage,
      {
        type: 'ai',
        text: `${markdownContent}\n\n\`\`\`js\n${codeContent}`,
        _id: '3',
        segments: [
          { type: 'markdown', content: markdownContent },
          { type: 'code', content: codeContent },
        ],
        isStreaming: true,
        session_id: 'test-session',
        created_at: Date.now(),
      } as AiChatMessage,
    ];

    render(<MessageList messages={messages} isStreaming={true} />);

    // Check if we see both types of content
    const markdownElement = screen.queryByText(/This quiz app allows users/);
    const codeElement = screen.queryByText(/import React/);

    writeToStdout(`Markdown content visible? ${markdownElement ? 'YES' : 'NO'}`);
    writeToStdout(`Code content visible? ${codeElement ? 'YES' : 'NO'}`);

    if (markdownElement && codeElement) {
      writeToStdout('Both segments rendering correctly in test');
    } else {
      writeToStdout('SEGMENTS MISSING - same issue as in real app?');
    }

    expect(markdownElement).toBeInTheDocument();
    expect(codeElement).toBeInTheDocument();
  });
});
