import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UnifiedSession from '../app/routes/unified-session';

// Mock dependencies
vi.mock('../app/hooks/useSimpleChat', () => ({
  useSimpleChat: () => ({
    docs: [],
    input: '',
    setInput: vi.fn(),
    isStreaming: false,
    inputRef: { current: null },
    sendMessage: vi.fn(),
    selectedSegments: [],
    selectedCode: null,
    selectedDependencies: {},
    title: '',
    sessionId: null,
    selectedResponseDoc: undefined,
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

// Mock React Router hooks
vi.mock('react-router', () => ({
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
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
    // Render the unified session component
    render(<UnifiedSession />);

    // Check that the main components are rendered
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    expect(screen.getByTestId('result-preview')).toBeInTheDocument();
  });
});
