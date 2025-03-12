import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../app/routes/home';

// Mock dependencies
vi.mock('../app/hooks/useSimpleChat', () => ({
  useSimpleChat: () => ({
    messages: [],
    setMessages: vi.fn(),
    input: '',
    setInput: vi.fn(),
    isStreaming: () => false,
    inputRef: { current: null },
    messagesEndRef: { current: null },
    autoResizeTextarea: vi.fn(),
    scrollToBottom: vi.fn(),
    sendMessage: vi.fn(),
    currentSegments: () => [],
    getCurrentCode: () => '',
    title: '',
    setTitle: vi.fn(),
  }),
}));

// Mock the useSession hook
vi.mock('../app/hooks/useSession', () => ({
  useSession: () => ({
    session: null,
    loading: false,
    error: null,
    loadSession: vi.fn(),
    updateTitle: vi.fn(),
    updateMetadata: vi.fn(),
    addScreenshot: vi.fn(),
    createSession: vi.fn().mockResolvedValue('new-session-id'),
    database: {
      put: vi.fn().mockResolvedValue({ ok: true }),
    },
    mergeSession: vi.fn(),
  }),
}));

vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {
      put: vi.fn().mockResolvedValue({ ok: true }),
    },
    useDocument: () => ({
      doc: {},
      merge: vi.fn(),
      save: vi.fn().mockResolvedValue({ id: 'test-id' }),
    }),
  }),
}));

// Mock our ChatInterface
vi.mock('../app/ChatInterface', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      return <div data-testid="chat-interface">Chat Interface</div>;
    },
  };
});

// Mock ResultPreview
vi.mock('../app/components/ResultPreview/ResultPreview', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      return <div data-testid="result-preview">Result Preview</div>;
    },
  };
});

describe('Home Route', () => {
  it('should render the chat interface and result preview', () => {
    // Render the home component
    render(<Home />);

    // Check that the main components are rendered
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    expect(screen.getByTestId('result-preview')).toBeInTheDocument();
  });
});
