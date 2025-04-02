# Database Sharding Plan

## Current Architecture

Currently, the application uses a single Fireproof database (`FIREPROOF_CHAT_HISTORY`) to store all data:

- Session metadata
- Screenshots
- Messages (both user and AI)
- App code and other generated content

This design creates a single large database that contains all user data, which could lead to performance issues as the application scales.

## Proposed Architecture

We will implement a sharded database approach where:

1. `FIREPROOF_CHAT_HISTORY` will only store session metadata (minimal data needed for the session list)
2. Each session will have its own dedicated database named based on the session ID
3. All session-specific content (messages, screenshots, app code, etc.) will be stored in the session-specific database

Session metadata is stored in the FIREPROOF_CHAT_HISTORY database, while all session-specific content is stored in individual `vibe-${sessionId}` databases.

## Required Changes

### 1. Database Configuration

Create a utility function to manage database instances:

```typescript
// app/utils/databaseManager.ts
import { fireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';

// Get the main sessions database
export const getSessionsDatabase = () => {
  return fireproof(FIREPROOF_CHAT_HISTORY);
};

// Get a session-specific database
export const getSessionDatabase = (sessionId: string) => {
  if (!sessionId) throw new Error('Session ID is required');
  return fireproof(`vibe-${sessionId}`);
};
```

### 2. Hook Modifications

#### useSessionList

```typescript
// app/hooks/sidebar/useSessionList.ts
export function useSessionList(justFavorites = false) {
  // Get sessions from main database
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  // Query only session documents (no screenshots)
  const { docs: sessionDocs } = useLiveQuery('type', { key: 'session' });

  // For each session, query its screenshots from the session database
  const groupedSessions = useMemo(() => {
    if (!sessionDocs || sessionDocs.length === 0) return [];

    // Process all sessions and fetch screenshots
    const result = sessionDocs.map(async (session) => {
      // Create a session-specific database instance
      const sessionDb = getSessionDatabase(session._id);

      // Query screenshots from session database
      const screenshots = await sessionDb.query('type', { key: 'screenshot' });

      return {
        session,
        screenshots: screenshots.docs,
      };
    });

    // Return sorted sessions
    return Promise.all(result).then((sessions) =>
      sessions.sort((a, b) => {
        const timeA = a.session.created_at || 0;
        const timeB = b.session.created_at || 0;
        return timeB - timeA;
      })
    );
  }, [sessionDocs]);

  return {
    groupedSessions,
    count: groupedSessions.length,
  };
}
```

#### useSession

```typescript
// app/hooks/useSession.ts
export function useSession(sessionId: string | null) {
  // Main database for session metadata
  const { database: mainDb, useDocument } = useFireproof(FIREPROOF_CHAT_HISTORY);

  // Session-specific database
  const sessionDb = sessionId ? getSessionDatabase(sessionId) : null;

  // Use useDocument hook to interact with the session document in main DB
  const {
    doc: session,
    merge: mergeSession,
    save: saveSession,
  } = useDocument<SessionDocument>(
    sessionId
      ? { _id: sessionId, type: 'session', created_at: Date.now() }
      : { type: 'session', title: 'New Chat', created_at: Date.now() }
  );

  // Functions that store data in session-specific database
  const addScreenshot = useCallback(
    async (imageFile: File) => {
      if (!sessionId || !sessionDb) return null;

      // Create screenshot in session-specific database
      const screenshotDoc = {
        type: 'screenshot',
        session_id: sessionId,
        created_at: Date.now(),
        _files: { 'screenshot.png': imageFile },
      };

      const result = await sessionDb.put(screenshotDoc);
      return result.id;
    },
    [sessionId, sessionDb]
  );

  return {
    session,
    mainDb,
    sessionDb,
    mergeSession,
    saveSession,
    addScreenshot,
    // other existing functions
  };
}
```

#### useSessionMessages

```typescript
// app/hooks/useSessionMessages.ts
export function useSessionMessages(sessionId: string | null) {
  // Only create the session database if we have a sessionId
  const { useFireproof } = require('use-fireproof');
  const { useLiveQuery } = sessionId
    ? useFireproof(`vibe-${sessionId}`)
    : { useLiveQuery: () => ({ docs: [] }) };

  // Query messages directly from session database
  const { docs } = useLiveQuery('type', {
    keys: ['user-message', 'ai-message'],
    limit: 100,
  });

  // Rest of the hook remains the same, but without filtering by session_id
  // since all messages in this database belong to this session
}
```

### 3. Message Handling

When saving messages, use the session-specific database:

```typescript
// In any component that saves messages
const saveUserMessage = async (text: string) => {
  if (!sessionId) return;

  const sessionDb = getSessionDatabase(sessionId);

  await sessionDb.put({
    type: 'user-message',
    session_id: sessionId, // Still include for data portability
    created_at: Date.now(),
    text,
  });
};
```

### 4. Migration Plan

1. Create a migration utility to move existing data:

   - Read all data from FIREPROOF_CHAT_HISTORY
   - For each session, create a new session-specific database
   - Move all related data (messages, screenshots) to the new database
   - Keep only session metadata in the main database

2. Update application code according to the changes outlined above

3. Add a version flag to detect and migrate existing data on application startup

## Benefits

1. **Improved Performance**: Smaller databases with focused content
2. **Better Scalability**: Session databases can be loaded on-demand
3. **Data Isolation**: Session data is contained within its own database
4. **Reduced Memory Usage**: Only load necessary databases

## Implementation Priority

1. Create database utilities
2. Update useSession hook
3. Update useSessionMessages hook
4. Update useSessionList hook
5. Create migration utility
6. Test with existing data

## Testing Strategy

1. Write unit tests for each modified hook
2. Create test cases for both fresh installs and migrations
3. Performance test with a large number of sessions

## Component Database Access Patterns

When implementing the sharded database approach, we need to consider how different components will interact with the databases:

### Components That Can Use `useFireproof` Directly

Components that operate within a single database context can use the standard hook pattern:

```typescript
function SessionMessagesComponent({ sessionId }) {
  // This works because we're only accessing a single session database
  const { useLiveQuery } = useFireproof(`vibe-${sessionId}`);
  const { docs } = useLiveQuery('type', { keys: ['user-message', 'ai-message'] });

  return <MessageList messages={docs} />;
}
```

These components include:

- `MessageList` - Shows messages for the current session
- `MessageInput` - Writes to the current session
- `SessionDetails` - Displays details about the current session
- Any component that interacts with data from a single session

### Components That Need Async Handling

Components that need to access multiple databases or aggregate data across databases require a different approach:

```typescript
function SessionSidebar() {
  // First, get all sessions from the main database
  const { useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const { docs: sessions } = useLiveQuery('type', { key: 'session' });

  // Then, manage screenshot data with useEffect and local state
  const [sessionsWithScreenshots, setSessionsWithScreenshots] = useState([]);

  useEffect(() => {
    // This must be handled asynchronously
    async function fetchScreenshots() {
      const results = await Promise.all(
        sessions.map(async (session) => {
          const sessionDb = getSessionDatabase(session._id);
          const screenshots = await sessionDb.query('type', { key: 'screenshot' });
          return { ...session, screenshots: screenshots.docs };
        })
      );
      setSessionsWithScreenshots(results);
    }

    fetchScreenshots();
  }, [sessions]);

  return <SessionList sessions={sessionsWithScreenshots} />;
}
```

These components include:

- `SessionSidebar` - Lists all sessions with their latest screenshots
- `ScreenshotGallery` - Shows screenshots from multiple sessions
- `AdminDashboard` - Might need to aggregate data across all sessions
- Any component that needs to access multiple session databases

### Mixed Access Pattern Components

Some components might need both approaches:

```typescript
function SearchResults({ query }) {
  // First search session metadata (synchronous with useFireproof)
  const { useLiveQuery: useMainQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const { docs: matchingSessions } = useMainQuery((doc) => {
    if (doc.type === 'session' && doc.title && doc.title.includes(query)) {
      return doc._id;
    }
    return null;
  });

  // Then search within those sessions' messages (asynchronous)
  const [results, setResults] = useState([]);

  useEffect(() => {
    async function searchMessages() {
      const searchResults = await Promise.all(
        matchingSessions.map(async (session) => {
          const sessionDb = getSessionDatabase(session._id);
          const messages = await sessionDb.query((doc) => {
            if (doc.text && doc.text.includes(query)) {
              return true;
            }
            return null;
          });
          return { session, matches: messages.docs };
        })
      );
      setResults(searchResults.filter(r => r.matches.length > 0));
    }

    searchMessages();
  }, [matchingSessions, query]);

  return <SearchResultsList results={results} />;
}
```

### Performance Considerations

When accessing multiple databases:

1. Consider implementing pagination to avoid loading all data at once
2. Use debouncing for searches across multiple databases
3. Cache results when appropriate
4. Implement background loading with visual indicators
5. Consider lazy-loading databases only when their data is needed

Now that I've implemented the core components of the database sharding plan, let me summarize the changes I've made:

Implemented Database Sharding Pattern
I've implemented the database sharding approach as outlined in the plan, where:

Session metadata remains in the FIREPROOF_CHAT_HISTORY database
Session-specific content (messages, screenshots, app code) is stored in individual session databases named vibe-${sessionId}
Key Components Modified:
Database Management Layer
Created databaseManager.ts utility for consistent database access
Provides functions to access both the main database and session-specific databases
Session Management
Updated useSession hook to use dual-database approach
Session metadata stored in main database
Messages and screenshots stored in session-specific database
Session List Management
Updated useSessionList hook to fetch sessions from main database
Then retrieves screenshots from each session's dedicated database
Database View UI
Enhanced DatabaseListView to show both main database and session-specific databases
Added UI for switching between available databases
Migration Support
Created migration utilities to move existing data to the new structure
Added hooks for managing the migration process
Implementation is non-destructive, preserving original data until migration is confirmed
Data Flow in the New Architecture:
When creating a new session:
Session metadata goes to FIREPROOF_CHAT_HISTORY
A new session database vibe-${sessionId} is created for content
When adding content to a session:
Messages, screenshots, and app code go to the session-specific database
No content-heavy items are stored in the main database anymore
This approach should provide better scalability as each session's data is isolated, and the main database only contains lightweight metadata. The implementation maintains backward compatibility through the migration system, ensuring existing users' data is preserved.

Would you like me to make any additional changes or explain any part of the implementation in more detail?
