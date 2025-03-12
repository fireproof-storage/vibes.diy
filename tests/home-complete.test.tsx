import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Home from '../app/routes/home';
import * as segmentParser from '../app/utils/segmentParser';
import * as useSimpleChatModule from '../app/hooks/useSimpleChat';
import type { ChatMessage, UserChatMessage, AiChatMessage, Segment } from '../app/types/chat';

// Create a mock navigate function
const navigateMock = vi.fn();

// Mock useNavigate hook from react-router - this mock applies to all tests
vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

// Define types for mock components
interface ChatInterfaceProps {
  chatState: {
    messages: ChatMessage[];
    setMessages: (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isStreaming: () => boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    autoResizeTextarea: () => void;
    scrollToBottom: () => void;
    sendMessage: () => Promise<void>;
    currentSegments: () => Segment[];
    getCurrentCode: () => string;
    title: string;
    setTitle: (title: string) => Promise<void>;
    sessionId?: string | null;
    isLoadingMessages?: boolean;
  };
  sessionId?: string | null;
  onSessionCreated?: (sessionId: string) => void;
}

interface ResultPreviewProps {
  code: string;
  dependencies: Record<string, string>;
  streamingCode: string;
  isStreaming: boolean;
  isSharedApp: boolean;
  shareStatus?: string;
  onShare?: () => void;
  completedMessage: string;
  currentStreamContent: string;
  currentMessage?: { content: string };
}

interface AppLayoutProps {
  chatPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
  writable: true,
});

// Mock window.location
const originalLocation = window.location;
Object.defineProperty(window, 'location', {
  value: {
    // Use only the properties we want to override
    origin: 'https://example.com',
    pathname: '/',
    hash: '',
  },
  writable: true,
});

// Mock components used in the Home component
vi.mock('../app/ChatInterface', () => ({
  default: ({ chatState, sessionId, onSessionCreated }: ChatInterfaceProps) => (
    <div data-testid="mock-chat-interface">
      <button 
        data-testid="create-session-button" 
        onClick={() => onSessionCreated?.('new-session-id')}
      >
        Create Session
      </button>
    </div>
  ),
}));

vi.mock('../app/components/ResultPreview/ResultPreview', () => ({
  default: ({ 
    code, 
    dependencies, 
    streamingCode, 
    isStreaming, 
    isSharedApp, 
    shareStatus,
    onShare,
    completedMessage,
    currentStreamContent,
    currentMessage
  }: ResultPreviewProps) => (
    <div data-testid="mock-result-preview">
      <div data-testid="code-line-count">{code.split('\n').length} lines of code</div>
      <div data-testid="code-content">{code.substring(0, 50)}...</div>
      <div data-testid="message-content">{completedMessage.substring(0, 50)}</div>
      {shareStatus && <div data-testid="share-status">{shareStatus}</div>}
      <button 
        data-testid="share-button" 
        onClick={onShare}
      >
        Share
      </button>
    </div>
  ),
}));

vi.mock('../app/components/AppLayout', () => ({
  default: ({ chatPanel, previewPanel }: AppLayoutProps) => (
    <div data-testid="mock-app-layout">
      <div data-testid="chat-panel">{chatPanel}</div>
      <div data-testid="preview-panel">{previewPanel}</div>
    </div>
  ),
}));

// Mock useFireproof hook
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    db: {
      put: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
      get: vi.fn().mockResolvedValue({ _id: 'mock-doc-id', messages: [] }),
      findOne: vi.fn().mockResolvedValue(null),
      query: vi.fn(),
    },
    useDocument: () => ({ doc: null, isLoading: false }),
    useLiveQuery: () => ({ docs: [], isLoading: false }),
  }),
}));

describe('Home Route in completed state', () => {
  let mockCode: string;
  
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    mockCode = Array(210)
      .fill(0)
      .map((_, i) => `console.log("Line ${i}");`)
      .join('\n');
      
    // Mock segmentParser functions
    vi.spyOn(segmentParser, 'parseContent').mockReturnValue({
      segments: [
        { type: 'code', content: mockCode } as Segment,
        { type: 'markdown', content: 'Explanation of the code' } as Segment,
      ],
      dependenciesString: JSON.stringify({ dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' } })
    });
    
    vi.spyOn(segmentParser, 'parseDependencies').mockReturnValue({
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    });
    
    // Mock useSimpleChat hook to return a chat with completed AI message containing code
    vi.spyOn(useSimpleChatModule, 'useSimpleChat').mockReturnValue({
      messages: [
        { 
          type: 'user', 
          text: 'Create a React app' 
        } as UserChatMessage,
        { 
          type: 'ai', 
          text: '```javascript\n' + mockCode + '\n```\n\nExplanation of the code',
          segments: [
            { type: 'code', content: mockCode } as Segment,
            { type: 'markdown', content: 'Explanation of the code' } as Segment
          ],
          isStreaming: false
        } as AiChatMessage
      ],
      sendMessage: vi.fn(),
      isStreaming: () => false,
      setMessages: vi.fn(),
      input: '',
      setInput: vi.fn(),
      currentSegments: () => [
        { type: 'code', content: mockCode } as Segment,
        { type: 'markdown', content: 'Explanation of the code' } as Segment
      ],
      getCurrentCode: () => mockCode,
      inputRef: { current: null },
      messagesEndRef: { current: null },
      autoResizeTextarea: vi.fn(),
      scrollToBottom: vi.fn(),
      title: 'React App',
      setTitle: vi.fn(),
      sessionId: null,
      isLoadingMessages: false
    });
  });

  it('displays the correct number of code lines in the preview', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('code-line-count')).toHaveTextContent('210 lines of code');
    });
  });

  it('shows share button and handles sharing', async () => {
    render(<Home />);

    // Find share button and click it
    const shareButton = await screen.findByTestId('share-button');
    fireEvent.click(shareButton);

    // Wait for the share status to update
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('creates a new session when create-session button is clicked', async () => {
    render(<Home />);

    // Find create session button and click it
    const createSessionButton = await screen.findByTestId('create-session-button');
    fireEvent.click(createSessionButton);

    // Wait for navigation to be called
    await waitFor(() => {
      // Verify navigation was called with the new session ID
      expect(navigateMock).toHaveBeenCalledWith('/session/new-session-id');
    });
  });

  it('loads code from URL hash state when present', async () => {
    // Create a mock code and dependencies
    const hashCode = 'console.log("from hash");';
    const hashDependencies = { react: "^17.0.2" };
    
    // Create and set the hash state
    const stateObj = { code: hashCode, dependencies: hashDependencies };
    const encoded = btoa(encodeURIComponent(JSON.stringify(stateObj)));
    
    // Update the mocked window.location to include the hash
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://example.com',
        pathname: '/',
        hash: `#state=${encoded}`,
      },
      writable: true,
    });

    render(<Home />);

    // Verify that the code from the hash is displayed
    await waitFor(() => {
      const codeContent = screen.getByTestId('code-content');
      expect(codeContent.textContent).toContain('console.log("from hash")');
    });
  });
}); 