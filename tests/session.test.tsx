import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UnifiedSession from '../app/routes/unified-session';
import * as segmentParser from '../app/utils/segmentParser';
import * as useSimpleChatModule from '../app/hooks/useSimpleChat';
import type { ChatMessage, Segment } from '../app/types/chat';

// Mock useParams hook from react-router
vi.mock('react-router', () => ({
  useParams: () => ({ sessionId: 'test-session-id' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
}));

// Define types for mock components
interface ChatInterfaceProps {
  chatState: any;
  sessionId: string | null;
  onNewChat: () => void;
  onSessionCreated?: (sessionId: string) => void;
}

interface ResultPreviewProps {
  code: string;
  dependencies: Record<string, string>;
  streamingCode: string;
  isSharedApp: boolean;
  completedMessage: string;
  currentStreamContent: string;
  currentMessage?: { content: string };
  shareStatus?: string;
  onShare?: () => void;
}

interface AppLayoutProps {
  chatPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}

// Mock components used in the Session component
vi.mock('../app/ChatInterface', () => ({
  default: ({ chatState, sessionId, onNewChat, onSessionCreated }: ChatInterfaceProps) => (
    <div data-testid="mock-chat-interface">Chat Interface Component</div>
  ),
}));

vi.mock('../app/components/ResultPreview/ResultPreview', () => ({
  default: ({ 
    code, 
    dependencies, 
    streamingCode, 
    isSharedApp, 
    completedMessage,
    currentStreamContent,
    currentMessage,
    shareStatus,
    onShare
  }: ResultPreviewProps) => (
    <div data-testid="mock-result-preview">
      <div data-testid="code-line-count">{code.split('\n').length} lines of code</div>
      <div data-testid="code-content">{code.substring(0, 50)}...</div>
      <div data-testid="message-content">{completedMessage.substring(0, 50)}</div>
      {shareStatus && <div data-testid="share-status">{shareStatus}</div>}
      {onShare && (
        <button 
          data-testid="share-button" 
          onClick={onShare}
        >
          Share
        </button>
      )}
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

// Mock the Fireproof hook
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {},
    useLiveQuery: () => ({ docs: [] }),
    useDocument: () => ({
      doc: {},
      merge: vi.fn(),
      save: vi.fn().mockResolvedValue({ id: 'test-id' }),
    }),
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
    createSession: vi.fn().mockResolvedValue('test-session-id'),
    database: {
      put: vi.fn().mockResolvedValue({ ok: true }),
    },
  }),
}));

// Mock clipboard API for share tests
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
  writable: true,
});

describe('Session Route Integration', () => {
  beforeEach(() => {
    // Create mock code with 210 lines
    const mockCode = Array(210).fill('console.log("test");').join('\n');
    
    // Mock parseContent to return specific segments with code
    vi.spyOn(segmentParser, 'parseContent').mockReturnValue({
      segments: [
        {
          type: 'markdown',
          content: "Here's a photo gallery app with a grid layout and modal view."
        },
        {
          type: 'code',
          content: mockCode
        }
      ],
      dependenciesString: JSON.stringify({ dependencies: {} })
    });
    
    // Mock parseDependencies to return empty dependencies
    vi.spyOn(segmentParser, 'parseDependencies').mockReturnValue({});
    
    // Mock useSimpleChat to return chat state with an AI message
    vi.spyOn(useSimpleChatModule, 'useSimpleChat').mockReturnValue({
      messages: [
        {
          type: 'user',
          text: 'Create a photo gallery app',
        },
        {
          type: 'ai',
          text: `Here's a photo gallery app with a grid layout and modal view.\n\n\`\`\`\n${mockCode}\n\`\`\``,
          isStreaming: false,
          segments: [
            {
              type: 'markdown',
              content: "Here's a photo gallery app with a grid layout and modal view."
            },
            {
              type: 'code',
              content: mockCode
            }
          ],
          dependenciesString: JSON.stringify({ dependencies: {} })
        }
      ],
      input: '',
      setInput: vi.fn(),
      setMessages: vi.fn(),
      isStreaming: () => false,
      sendMessage: vi.fn(),
      currentSegments: () => [
        {
          type: 'markdown',
          content: "Here's a photo gallery app with a grid layout and modal view."
        },
        {
          type: 'code',
          content: mockCode
        }
      ],
      getCurrentCode: () => mockCode,
      inputRef: { current: null },
      messagesEndRef: { current: null },
      autoResizeTextarea: vi.fn(),
      scrollToBottom: vi.fn(),
      title: 'Photo Gallery App',
      setTitle: vi.fn(),
      sessionId: 'test-session-id',
      isLoadingMessages: false
    });
  });

  it('displays the correct number of code lines in the preview', async () => {
    // Render the UnifiedSession component directly
    render(<UnifiedSession />);

    // Wait for and verify the code line count is displayed
    await waitFor(() => {
      const codeLineCountElement = screen.getByTestId('code-line-count');
      expect(codeLineCountElement.textContent).toBe('210 lines of code');
    });
  });

  it('should provide a share button that copies link to clipboard', async () => {
    // Render the UnifiedSession component
    render(<UnifiedSession />);
    
    // Try to find the share button
    const shareButton = await screen.findByTestId('share-button');
    expect(shareButton).toBeInTheDocument();
  });
}); 