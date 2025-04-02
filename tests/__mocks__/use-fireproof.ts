// Mock implementation for use-fireproof module
import { vi } from 'vitest';

// Mock session data for testing
export const mockSessions = [
  {
    _id: 'session1',
    type: 'session',
    title: 'Test Session 1',
    timestamp: Date.now() - 1000000,
    messages: [
      { text: 'Hello', type: 'user' },
      { text: 'Hi there', type: 'ai', code: 'console.log("Hello")' },
    ],
  },
  {
    _id: 'session2',
    type: 'session',
    title: 'Test Session 2',
    timestamp: Date.now(),
    messages: [{ text: 'Another test', type: 'user' }],
  },
];

// Mock screenshot data
export const mockScreenshots = [
  {
    _id: 'screenshot1',
    type: 'screenshot',
    session_id: 'session1',
    timestamp: Date.now(),
    _files: {
      screenshot: {
        file: () => Promise.resolve(new File([''], 'test.png', { type: 'image/png' })),
        type: 'image/png',
      },
    },
  },
];

// Combined array for simplified querying
export const mockSessionAndScreenshots = [...mockSessions, ...mockScreenshots];

// Mock database implementation
const createMockDb = () => ({
  put: vi.fn().mockResolvedValue({ id: 'test-id' }),
  get: vi.fn().mockImplementation((id: string) => {
    const doc = mockSessionAndScreenshots.find((d) => d._id === id);
    return Promise.resolve(doc || { _id: id, title: 'Test' });
  }),
  query: vi.fn().mockResolvedValue({
    rows: mockSessionAndScreenshots.map((doc) => ({
      id: doc._id,
      key: doc._id,
      value: doc,
    })),
  }),
  delete: vi.fn().mockResolvedValue({ ok: true }),
});

// Mock fireproof function
export const fireproof = vi.fn().mockImplementation(() => createMockDb());

// Mock useFireproof hook
export const useFireproof = vi.fn().mockImplementation((dbName?: string) => {
  // Define the database function
  const database = createMockDb();

  // Define the useLiveQuery function that can be destructured
  const useLiveQuery = vi.fn().mockImplementation((queryFn: any, options?: any) => {
    // Handle different query types
    if (typeof queryFn === 'string') {
      if (queryFn.includes('type=session') || queryFn === 'session') {
        return { docs: mockSessions, status: 'success' };
      } else if (queryFn.includes('session_id=') || queryFn === 'screenshot') {
        return { docs: mockScreenshots, status: 'success' };
      }
      return { docs: [], status: 'success' };
    }

    // Function-based queries
    try {
      const filteredDocs = mockSessionAndScreenshots.filter((doc) => {
        try {
          return queryFn(doc);
        } catch {
          return false;
        }
      });
      return { docs: filteredDocs, status: 'success' };
    } catch {
      return { docs: [], status: 'success' };
    }
  });

  // Define the useDocument function
  const useDocument = vi.fn().mockReturnValue({
    doc: mockSessions[0],
    merge: vi.fn(),
    save: vi.fn(),
  });

  // Define the useAllDocs function
  const useAllDocs = vi.fn().mockReturnValue({
    docs: mockSessionAndScreenshots.map((doc) => ({
      id: doc._id,
      key: doc.type,
      value: { rev: '1-abc123' },
      doc,
    })),
    total: mockSessionAndScreenshots.length,
    loading: false,
    error: null,
  });

  // Return an object with all functions for destructuring
  return {
    database,
    useLiveQuery,
    useDocument,
    useAllDocs,
    getDB: () => database,
    useDB: () => database,
  };
});

// Mock database manager object that can be imported by tests
export const mockDatabaseManager = {
  getSessionsDatabase: vi.fn().mockReturnValue(createMockDb()),
  getSessionDatabase: vi.fn().mockReturnValue(createMockDb()),
  getSessionDatabaseName: vi.fn((id: string) => `app-${id}`),
};

// Export default for compatibility with different import styles
export default {
  fireproof,
  useFireproof,
};
