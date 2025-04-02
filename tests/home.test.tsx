import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UnifiedSession from '../app/routes/home';

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
    codeReady: false,
    addScreenshot: vi.fn(),
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

// Using centralized mock from __mocks__/use-fireproof.ts

// Mock React Router hooks
vi.mock('react-router', () => ({
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '', pathname: '/' }),
}));

// Mock for the utility functions
vi.mock('../app/utils/sharing', () => ({
  decodeStateFromUrl: () => ({ code: '', dependencies: {} }),
}));

vi.mock('../app/components/SessionSidebar/utils', () => ({
  encodeTitle: (title: string) => title,
}));

// Mock AppLayout component to make testing easier
vi.mock('../app/components/AppLayout', () => {
  return {
    __esModule: true,
    default: ({
      chatPanel,
      previewPanel,
      chatInput,
      suggestionsComponent,
    }: {
      chatPanel: any;
      previewPanel: any;
      chatInput?: any;
      suggestionsComponent?: any;
    }) => {
      return (
        <div data-testid="app-layout">
          <div data-testid="chat-panel">{chatPanel}</div>
          <div data-testid="preview-panel">{previewPanel}</div>
          {chatInput && <div data-testid="chat-input-container">{chatInput}</div>}
          {suggestionsComponent && (
            <div data-testid="suggestions-container">{suggestionsComponent}</div>
          )}
        </div>
      );
    },
  };
});

// Mock our ChatInterface
vi.mock('../app/components/ChatInterface', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      return <div data-testid="chat-interface">Chat Interface</div>;
    },
    getChatInputComponent: (props: any) => {
      return <div data-testid="chat-input">Chat Input</div>;
    },
    getSuggestionsComponent: (props: any) => {
      return <div data-testid="suggestions">Suggestions</div>;
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

    // Check that the components are rendered in the AppLayout
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();

    // Check for the content inside the panels
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    expect(screen.getByTestId('result-preview')).toBeInTheDocument();
  });
});
