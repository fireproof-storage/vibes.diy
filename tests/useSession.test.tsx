import { renderHook, act } from '@testing-library/react';
import { useSession } from '../app/hooks/useSession';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the useFireproof hook
vi.mock('use-fireproof', () => {
  const mockSaveSession = vi
    .fn()
    .mockImplementation(() => Promise.resolve({ id: 'test-session-id' }));
  const mockMergeSession = vi.fn();

  return {
    useFireproof: () => ({
      database: {
        put: vi
          .fn()
          .mockImplementation((doc: any) => Promise.resolve({ id: doc._id || 'test-session-id' })),
        get: vi.fn().mockImplementation((id: string) =>
          Promise.resolve({
            _id: id,
            title: 'Test Session',
            type: 'session',
            timestamp: Date.now(),
          })
        ),
      },
      useDocument: () => ({
        doc: {
          _id: 'test-session-id',
          title: 'Test Session',
          type: 'session',
          timestamp: Date.now(),
        },
        merge: mockMergeSession,
        save: mockSaveSession,
      }),
      // Add useLiveQuery mock
      useLiveQuery: () => ({
        docs: [
          {
            _id: 'message-1',
            type: 'user',
            text: 'Test message',
            session_id: 'test-session-id',
            timestamp: Date.now(),
          },
          {
            _id: 'message-2',
            type: 'ai',
            text: 'AI response',
            session_id: 'test-session-id',
            timestamp: Date.now(),
          },
        ],
      }),
    }),
  };
});

describe('useSession', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return session data when sessionId is provided', async () => {
    const { result } = renderHook(() => useSession('test-session-id'));

    // Check initial state
    expect(result.current.session).toBeDefined();
    expect(result.current.session?._id).toBe('test-session-id');
    expect(result.current.session?.title).toBe('Test Session');
    expect(result.current.docs).toBeDefined();
    expect(result.current.docs.length).toBe(2);
  });

  test('should create a new session', async () => {
    const { result } = renderHook(() => useSession(undefined));

    // Create a new session
    let sessionId;
    await act(async () => {
      sessionId = await result.current.createSession?.('New Test Session');
    });

    // Check if session was created
    expect(sessionId).toBe('test-session-id');
  });

  test('should update session title', async () => {
    const { result } = renderHook(() => useSession('test-session-id'));

    // Update the title
    await act(async () => {
      await result.current.updateTitle('Updated Title');
    });

    // Verify merge and save were called
    const { useFireproof } = await import('use-fireproof');
    const mockUseDocument = (useFireproof as any)().useDocument;

    expect(mockUseDocument().merge).toHaveBeenCalledWith({ title: 'Updated Title' });
    expect(mockUseDocument().save).toHaveBeenCalled();
  });

  test('should update session metadata', async () => {
    const { result } = renderHook(() => useSession('test-session-id'));

    // Update metadata
    const metadata = { title: 'Metadata Title', timestamp: 12345 };
    await act(async () => {
      await result.current.updateMetadata?.(metadata);
    });

    // Verify merge and save were called with correct data
    const { useFireproof } = await import('use-fireproof');
    const mockUseDocument = (useFireproof as any)().useDocument;

    expect(mockUseDocument().merge).toHaveBeenCalledWith(metadata);
    expect(mockUseDocument().save).toHaveBeenCalled();
  });
});
