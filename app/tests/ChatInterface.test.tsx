import React from 'react';
import { render } from '@testing-library/react';
import ChatInterface from '../ChatInterface';
import { vi, describe, test, expect } from 'vitest';
import { ChatProvider } from '../context/ChatContext';

/**
 * Tests for the ChatInterface component
 * This file verifies the fix for the 'input is not defined' error in ChatInterface.tsx
 */

// Mock the useFireproof hook
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {},
    useLiveQuery: () => ({ docs: [] }),
  }),
}));

// Prepare mock data
const mockChatState = {
  messages: [],
  setMessages: vi.fn(),
  input: 'test input',
  setInput: vi.fn(),
  isGenerating: false,
  currentStreamedText: '',
  streamingCode: '',
  completedCode: '',
  isStreaming: false,
  inputRef: { current: null },
  messagesEndRef: { current: null },
  autoResizeTextarea: vi.fn(),
  scrollToBottom: vi.fn(),
  sendMessage: vi.fn(),
  parserState: {
    current: {
      inCodeBlock: false,
      codeBlockContent: '',
      dependencies: {},
      displayText: '',
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      reset: vi.fn()
    }
  },
  completedMessage: ''
};

describe('ChatInterface', () => {
  test('renders without error after fixing input destructuring', () => {
    // This test passes now that we've fixed the 'input is not defined' error
    // by properly destructuring input from chatState
    const { container } = render(
      <ChatProvider>
        <ChatInterface chatState={mockChatState} />
      </ChatProvider>
    );
    expect(container).toBeDefined();
  });
}); 