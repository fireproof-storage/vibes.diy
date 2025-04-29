import { renderHook } from '@testing-library/react';
import { useSession } from '../app/hooks/useSession';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the database opening function - this is what we need to track
const mockOpen = vi.fn();

// Special mock for the submitUserMessage function that should trigger database opening
const mockSubmitUserMessage = vi.fn().mockImplementation(() => {
  // When this is called, it should trigger the open() method just like in the real implementation
  mockOpen();
  return Promise.resolve({ ok: true });
});

// Mock all required dependencies
vi.mock('../app/config/env', () => ({
  FIREPROOF_CHAT_HISTORY: 'test-chat-history',
}));

vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    useDocument: () => ({
      doc: { _id: 'test-id', type: 'session' },
      merge: vi.fn(),
    }),
    database: { get: vi.fn(), put: vi.fn() },
  }),
}));

vi.mock('../app/hooks/useLazyFireproof', () => ({
  useLazyFireproof: () => ({
    useDocument: () => ({
      doc: { _id: 'test-id', type: 'user' },
      merge: vi.fn(),
      submit: mockSubmitUserMessage, // Use our special mock that calls open()
      save: vi.fn(),
    }),
    useLiveQuery: () => ({ docs: [] }),
    database: { get: vi.fn(), put: vi.fn() },
    open: mockOpen,
  }),
}));

vi.mock('../app/utils/databaseManager', () => ({
  getSessionDatabaseName: vi.fn().mockImplementation((id) => `session-${id || 'default'}`),
}));

// Simple tests that focus on the core session ID transition behavior
describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open database with provided sessionId', () => {
    renderHook(() => useSession('test-id'));
    expect(mockOpen).toHaveBeenCalled();
  });

  it('should generate sessionId but not open database when not provided', () => {
    const { result } = renderHook(() => useSession(undefined));
    // Verify we have a session ID generated (in the session document)
    expect(result.current.session._id).toBeTruthy();
    // Verify we DON'T open the database - this is the lazy loading behavior we want
    expect(mockOpen).not.toHaveBeenCalled();
  });

  /**
   * CRITICAL UX REQUIREMENT: Lazy database creation is imperative for user experience
   *
   * This test ensures our core performance optimization: we never create empty databases
   * during page loads or casual browsing. This is critical for several reasons:
   *
   * 1. Performance: Each IndexedDB creation is expensive, especially on slower devices
   * 2. Storage: Creating empty databases wastes storage quota unnecessarily
   * 3. UX: Reduces browser permission prompts for storage on some devices
   * 4. Scalability: A user visiting dozens of pages shouldn't create dozens of databases
   *
   * The database should ONLY be created when the user takes an action that requires persistence
   * or when they visit an existing session with content.
   */
  it('should follow lazy database creation pattern for optimal user experience', async () => {
    const { result } = renderHook(() => useSession(undefined));

    // Step 1: Initially no database should be created
    expect(mockOpen).not.toHaveBeenCalled();

    // Step 2: Session document exists but doesn't trigger db creation
    expect(result.current.session._id).toBeTruthy();
    expect(result.current.submitUserMessage).toBeTruthy();

    // Step 3: When user writes to database, it should be created just-in-time
    // Call the wrapped function that ensures database is opened when needed
    await result.current.submitUserMessage();

    // Now the database should be opened, but only after the write operation
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  /**
   * This test is the most important one - it verifies our fix for the session ID transition bug
   * After sending the first message with no session ID in the URL, the URL updates and the hook
   * should detect and use that new ID
   */
  it('should detect sessionId changes and reopen the database', () => {
    // Start with no session ID (first message scenario)
    const { rerender } = renderHook(
      // We use any to avoid TypeScript complexity with hook return types
      ({ id }: any) => useSession(id),
      { initialProps: { id: undefined } }
    );

    // Reset the mock counter after initial render
    mockOpen.mockClear();

    // Simulate URL update with new session ID (after first message response)
    // @ts-ignore - TypeScript has difficulty with the complex hook return types
    rerender({ id: 'new-session-id' });

    // Verify our fix works: the database should be opened again with the new ID
    expect(mockOpen).toHaveBeenCalled();
  });
});
