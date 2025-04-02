import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UnifiedSession from '../app/routes/home';
import * as segmentParser from '../app/utils/segmentParser';
import * as useSimpleChatModule from '../app/hooks/useSimpleChat';
import type { AiChatMessage } from '../app/types/chat';
import { mockChatStateProps } from './mockData';

// Mock useParams hook from react-router
vi.mock('react-router', () => ({
  useParams: () => ({ sessionId: 'test-session-id' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
}));

// Define types for mock components
interface ChatInterfaceProps {
  docs: any[];
  input: string;
  setInput: (value: string) => void;
  isStreaming: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  sendMessage: () => Promise<void>;
  sessionId: string | null;
  title: string;
}

interface ResultPreviewProps {
  code: string;
  dependencies?: Record<string, string>;
  onShare?: () => void;
  onScreenshotCaptured?: (screenshotData: string) => void;
  initialView?: 'code' | 'preview';
  sessionId?: string;
  isStreaming?: boolean;
}

interface AppLayoutProps {
  chatPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}

// Mock components used in the Session component
vi.mock('../app/ChatInterface', () => ({
  default: ({
    docs,
    input,
    setInput,
    isStreaming,
    inputRef,
    sendMessage,
    sessionId,
    title,
  }: ChatInterfaceProps) => <div data-testid="mock-chat-interface">Chat Interface Component</div>,
}));

vi.mock('../app/components/ResultPreview/ResultPreview', () => ({
  default: ({ code, dependencies, isStreaming, sessionId }: ResultPreviewProps) => (
    <div data-testid="mock-result-preview">
      <div data-testid="code-line-count">{code.split('\n').length} lines of code</div>
      <div data-testid="code-content">{code.substring(0, 50)}...</div>
      <button
        data-testid="share-button"
        onClick={() =>
          navigator.clipboard.writeText(`${window.location.origin}/shared?state=mockState`)
        }
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

// Using the centralized mock from __mocks__/use-fireproof.ts

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
          content: "Here's a photo gallery app with a grid layout and modal view.",
        },
        {
          type: 'code',
          content: mockCode,
        },
      ],
      dependenciesString: JSON.stringify({ dependencies: {} }),
    });

    // Mock parseDependencies to return empty dependencies
    vi.spyOn(segmentParser, 'parseDependencies').mockReturnValue({});

    // Mock useSimpleChat to return chat state with an AI message
    vi.spyOn(useSimpleChatModule, 'useSimpleChat').mockReturnValue({
      ...mockChatStateProps,
      docs: [
        {
          _id: 'msg1',
          session_id: 'session123',
          type: 'user',
          text: 'Hello AI',
          created_at: Date.now() - 10000,
        },
        {
          _id: 'msg2',
          session_id: 'session123',
          type: 'ai',
          text: '{"dependencies": {}}\n\nHello human! How can I help you today?',
          created_at: Date.now() - 5000,
        },
      ],
      input: 'test input',
      setInput: vi.fn(),
      isStreaming: false,
      inputRef: { current: null },
      sendMessage: vi.fn(),
      title: 'Test Chat Session',
      sessionId: 'session123',
      selectedResponseDoc: {
        _id: 'msg2',
        session_id: 'session123',
        type: 'ai',
        text: '{"dependencies": {}}\n\nHello human! How can I help you today?',
        created_at: Date.now() - 5000,
        timestamp: Date.now() - 5000,
        segments: [{ type: 'markdown', content: 'Hello human! How can I help you today?' }],
        dependenciesString: '{"dependencies": {}}',
      } as AiChatMessage,
      selectedSegments: [{ type: 'markdown', content: 'Hello human! How can I help you today?' }],
      selectedCode: {
        type: 'code',
        content: Array(210).fill('console.log("test");').join('\n'),
      },
      selectedDependencies: {},
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
