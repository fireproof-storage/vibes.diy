import { renderHook, act } from '@testing-library/react';
import { useSession } from '../app/hooks/useSession';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock database functions
const mockPut = vi
  .fn()
  .mockImplementation((doc: any) => Promise.resolve({ id: doc._id || 'test-session-id' }));
const mockMergeSession = vi.fn();
const mockSaveSession = vi
  .fn()
  .mockImplementation(() => Promise.resolve({ id: 'test-session-id' }));

// Mock the useFireproof hook
vi.mock('use-fireproof', () => {
  return {
    useFireproof: () => ({
      database: {
        put: mockPut,
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

  test('should update session title', async () => {
    const { result } = renderHook(() => useSession('test-session-id'));

    // Update the title
    await act(async () => {
      await result.current.updateTitle('Updated Title');
    });

    // Verify database.put was called with the updated session
    expect(mockPut).toHaveBeenCalled();
    expect(mockMergeSession).toHaveBeenCalledWith({ title: 'Updated Title' });
  });

  // This test is now removed since updateMetadata no longer exists in the useSession hook
  // test('should update session metadata', async () => {
  //   const { result } = renderHook(() => useSession('test-session-id'));

  //   // Update metadata
  //   const metadata = { title: 'Metadata Title', timestamp: 12345 };
  //   await act(async () => {
  //     await result.current.updateMetadata?.(metadata);
  //   });

  //   // Verify merge and save were called with correct data
  //   const { useFireproof } = await import('use-fireproof');
  //   const mockUseDocument = (useFireproof as any)().useDocument;

  //   expect(mockUseDocument().merge).toHaveBeenCalledWith(metadata);
  //   expect(mockUseDocument().save).toHaveBeenCalled();
  // });
});
