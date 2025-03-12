Comprehensive documentation for the target architecture focusing on:

1. The flow from user input to completed responses
2. How sidebar uses live query to find titles and screenshots
3. How message list uses live query to show exchanges
4. When and how we update the database (only on completed events)

We are OK with our current Streaming State Management. It works, we can improve it later.

Let me structure this documentation:

1. Introduction to the architecture
2. Data model (document types)
3. Home.tsx workflow
4. Session management
5. Message management
6. Sidebar implementation
7. Message list implementation
8. Database update patterns
9. Benefits of this architecture

I'll avoid code snippets and focus on API names and file references.

# Target Architecture: Session-Based Document-Oriented Application

## Data Model

Our application's data model revolves around a clear separation of document types in Fireproof:

1. **Session Documents** (`type: 'session'`)

   - Created via `useDocument()` in `useSession` hook on @home.tsx
   - Contains metadata like `title` and `created_at` timestamp
   - Also initial `prompt` field with user's first message
   - Represents the container for a conversation

2. **AI Message Documents** (`type: 'ai-message'`)

   - Created via `database.put()` in `useSessionMessages` hook
   - Contains the `rawMessage` field with complete AI response
   - Linked to a session via `session_id`

3. **User Message Documents** (`type: 'user-message'`)

   - Created via `database.put()` in `useSessionMessages` hook
   - Contains the `prompt` field with user input
   - Linked to a session via `session_id`

4. **Screenshot Documents** (`type: 'screenshot'`)
   - Created via `database.put()` in screenshot functions
   - Contains screenshot data in `_files` field
   - Linked to a session via `session_id` field

This separation brings several benefits:

- Clear boundaries between different types of data
- Ability to query specific document types efficiently
- Independent evolution of each document schema
- Simplified update patterns (no need to update large nested documents)

## User Input Flow (home.tsx)

1. **Session Creation**

   - When a user first visits `home.tsx`, the component creates a new session document
   - `useSession(null)` initializes a blank session via `useDocument`
   - `createSession('New Chat')` is called to persist the session
   - The resulting `sessionId` is stored in component state

2. **AI Response Handling**

   - After user prompt storage, `sendMessage()` initiates the OpenRouter API call
   - Sets `streamingState` to `true` for UI feedback
   - Buffers the streaming response in memory via `streamBufferRef.current`
   - UI components read this buffer for real-time display without database writes, via parseMessage() in useSimpleChat
   - When streaming completes, `addAiMessage(streamBuffer, timestamp)` creates a single `'ai-message'` document
   - Sets `streamingState` to `false` to update UI

3. **User Message Handling**

   - User types into the chat input (managed by `ChatInterface`)
   - When submitted, `chatState.sendMessage()` from `useSimpleChat` is called
   - This calls `addUserMessage(input)` from `useSessionMessages`
   - A new document with `type: 'user-message'` is created via `database.put()`
   - The prompt is stored immediately, no streaming updates
   - This message is immediately visible in the message list via live query

4. **Title Generation**

   - After the initial AI response is available, fetch is used to get the title
   - Calls `updateTitle()` from `useSession` to update the session document
   - this is also a useDocument merge() and save()

5. **Screenshot Capture**
   - When preview renders successfully, the SandpackEventListener triggers screenshot capture
   - Screenshot is stored as a separate document with `type: 'screenshot'`
   - Links to session via `session_id` field
   - This is already implemented

This flow ensures:

- Each document has a single responsibility
- User experience remains responsive during streaming
- Database is only updated on completed events (not per token)
- State transitions are clearly defined and trackable

## Sidebar Implementation

The `SessionSidebar` component uses Fireproof's reactivity to display sessions:

(Move these live queries to useSession as a helper hook)

1. **Session Loading**

   - Uses `useLiveQuery('type', { key: 'session' })` to get all sessions
   - Automatically updates when new sessions are created or titles change

2. **Screenshot Association**

   - Uses `useLiveQuery('type', { key: 'screenshot' })` to get all screenshots
   - Groups screenshots by session via their `session_id` field
   - Displays the most recent screenshot for each session

3. **Sorting and Filtering**
   - Sorts sessions by `created_at` field for chronological display
   - Can filter based on search terms applied to session titles

By using `useLiveQuery`, the sidebar automatically updates when:

- New sessions are created
- Session titles are generated or changed
- New screenshots are captured

This approach eliminates the need for manual state management or event listeners.

## Message List Implementation

The `MessageList` component displays the conversation thread:

1. **Message Loading**

   - Uses `useSessionMessages(sessionId)` hook which internally uses `useLiveQuery`
   - Gets all messages (`'user-message'` and `'ai-message'`) for the current session
   - Sorts messages by `created_at` timestamp for chronological display

2. **Message Rendering**

   - Maps message documents to appropriate UI components
   - For AI messages, parses `rawMessage` field into `segments` for rich display
   - Groups consecutive messages by sender for better UX

3. **Streaming Status**
   - Checks `streamingState` from `useSimpleChat` to display typing indicators
   - When streaming is active, displays content from memory buffer, not database
   - Ensures smooth UX without database polling

This approach provides:

- Real-time updates when messages are added
- Clean separation between database and UI state
- Efficient rendering with minimal re-renders

## Database Update Patterns

Our architecture follows a strict "update on completion" pattern:

1. **Session Updates**

   - Initial creation: Via `useDocument` in `useSession`
   - Title updates: Only when AI generates a final title or user edits it
   - No updates during streaming

2. **AI Message Updates**

   - Created only when streaming is complete
   - Contains the full response in a single document
   - No interim updates during streaming (buffer held in memory)

3. **User Message Updates**

   - Created immediately when user submits input
   - Never updated after creation (immutable)

4. **Screenshot Updates**
   - Created when screenshot capture completes
   - Never updated after creation (immutable)

Benefits of this approach:

- Dramatically reduced database writes
- Simpler debugging (each document represents a complete event)
- More efficient syncing in multi-user scenarios
- Less risk of interrupted/incomplete documents

## Performance Benefits

1. **Reduced Database Operations**

   - No per-token updates during streaming
   - Single document creation per user/AI message
   - Leverages Fireproof's efficient indexing

2. **Optimized React Rendering**

   - UI state derived directly from database documents
   - Minimal local state management
   - Clean props flow between components

3. **Efficient Queries**

   - Type-based queries enable fast lookups
   - Fireproof indexing optimizes for common access patterns

4. **Improved Offline Support**
   - Complete documents sync more reliably
   - Less chance of interrupted streaming updates
   - Better conflict resolution with complete documents

## Extension Points

This architecture supports future enhancements:

1. **Collaborative Editing**

   - Multiple users can view the same session via the same document IDs
   - Real-time updates via LiveQuery

2. **Additional Document Types**

   - File attachments as separate documents with `session_id`
   - User annotations or reactions
   - References to external resources

3. **Enhanced UI Features**
   - Message editing history (storing revisions)
   - Message threading/replies (using parent references)
   - Reactions to messages (as separate documents)

By maintaining clear document boundaries and relationships through `session_id`, the system can evolve while maintaining backward compatibility and performance.

# Fireproof `useLiveQuery` Query Definitions

The architecture described in `session-more.md` relies heavily on Fireproof's `useLiveQuery` hook to efficiently retrieve and display documents. Below is a detailed specification for each query mentioned in the document.

## Session Queries

## Core Query Patterns

### Session and Related Documents Query

<think>I need to focus on explaining the existing code snippet shown in the `especially_relevant_code_snippet` section, which relates to the "Session and Related Documents Query" mentioned in the documentation but currently seems to be empty or incomplete.

The code snippet shows:

1. A `useLiveQuery` call that uses a custom function to index documents based on whether they are sessions or screenshots
2. A `useMemo` hook that groups the results into a data structure that associates sessions with their screenshots

This is different from the more straightforward query patterns described in other parts of the documentation. Instead of making separate queries for sessions and screenshots, this code makes a single query that returns both types of documents and then groups them in memory.

I should explain:

1. How this custom query function works
2. Why this approach is used instead of separate queries
3. The benefits and potential considerations of this approach
4. How the grouping logic works

Let me craft an explanation for the "Session and Related Documents Query" section based on this code.</think>Looking at the code snippet provided, I'll add an explanation of the custom query approach shown in SessionSidebar.tsx.

## Core Query Patterns

### Session and Related Documents Query

```typescript
// In SessionSidebar.tsx
const { docs: sessionAndScreenshots } = useLiveQuery<SessionOrScreenshot>((doc) =>
  doc.type && doc.type === 'session' ? doc._id : (doc as any).session_id
);
```

**Purpose:** This query uses a custom indexing function to efficiently retrieve both session documents and their related screenshots in a single query operation.

**How it works:**

- Instead of querying by field name, this approach uses a custom function that:
  - For session documents (`doc.type === 'session'`): Returns the document's `_id`
  - For screenshot documents: Returns the document's `session_id`
- This creates a virtual index where sessions and their screenshots share the same key value

**Benefits:**

- Eliminates the need for multiple separate queries
- Reduces network overhead by fetching related data in a single operation
- Creates a natural grouping mechanism in the returned data

**Post-query processing:**

```typescript
// Group sessions and screenshots together using useMemo
const groupedSessions = useMemo(() => {
  const groups = new Map<
    string,
    { session?: SessionDocument; screenshots: ScreenshotDocument[] }
  >();

  sessionAndScreenshots.forEach((doc) => {
    if ('type' in doc && doc.type === 'screenshot') {
      // Handle screenshot
      const sessionId = doc.session_id;
      let group = groups.get(sessionId);
      if (!group) {
        group = { session: undefined, screenshots: [] };
        groups.set(sessionId, group);
      }
      group.screenshots.push(doc as ScreenshotDocument);
    } else {
      // Handle session
      let group = groups.get(doc._id);
      if (!group) {
        group = { session: undefined, screenshots: [] };
        groups.set(doc._id, group);
      }
      group.session = doc as SessionDocument;
    }
  });

  return groups;
}, [sessionAndScreenshots]);
```

**Key aspects of the grouping logic:**

- Uses a Map with session IDs as keys
- Each map entry contains both the session document and an array of related screenshots
- Handles cases where screenshots might be encountered before their parent session

This approach is more efficient than separate queries when you need to display sessions along with their related visual content, as it reduces both the number of database operations and the complexity of state management in the component.

### Retrieving All Sessions

```typescript
// In useSession.ts or a custom hook like useSessionSidebar
const { docs: sessionDocs } = useLiveQuery('type', {
  key: 'session',
  limit: 50,
  descending: true,
});
```

**Purpose:** Retrieves all session documents for the sidebar display, sorted by most recent first.

**Parameters:**

- `'type'` - The index to query
- `key: 'session'` - Exact match for documents with `type: 'session'`
- `limit: 50` - Reasonable limit for performance while showing enough history
- `descending: true` - Shows newest sessions first

**Usage:** Powers the session list in the sidebar, automatically updates when new sessions are created or titles change.

## Screenshot Queries

### Retrieving All Screenshots

```typescript
// In useSession.ts or a custom hook like useSessionScreenshots
const { docs: screenshotDocs } = useLiveQuery('type', {
  key: 'screenshot',
  limit: 100,
});
```

**Purpose:** Retrieves all screenshot documents to associate with their respective sessions.

**Parameters:**

- `'type'` - The index to query
- `key: 'screenshot'` - Exact match for documents with `type: 'screenshot'`
- `limit: 100` - Higher limit to ensure we catch all screenshots

**Usage:** These screenshots are filtered and grouped by `session_id` in application code to display alongside sessions in the sidebar.

### Retrieving Screenshots for a Specific Session

```typescript
// In a component or hook that needs session-specific screenshots
const { docs: sessionScreenshots } = useLiveQuery('session_id', {
  key: sessionId,
  type: 'screenshot',
});
```

**Purpose:** Retrieves all screenshots associated with a specific session.

**Parameters:**

- `'session_id'` - Query by the session_id field
- `key: sessionId` - The ID of the current session
- `type: 'screenshot'` - Only retrieve screenshot documents

**Usage:** Used when displaying a specific session's screenshots in detail views.

## Message Queries

### Retrieving All Messages for a Session

```typescript
// In useSessionMessages.ts
const { docs: messageDocs } = useLiveQuery('type', {
  keys: ['user-message', 'ai-message'],
  limit: 100,
});
```

**Purpose:** Retrieves all message documents regardless of type, which are then filtered by `session_id` in the hook.

**Parameters:**

- `'type'` - The index to query
- `keys: ['user-message', 'ai-message']` - Match multiple document types
- `limit: 100` - Higher limit to ensure we capture long conversations

**Usage:** The core query that powers the message list. Application code further filters these by the current `session_id`.

### Session-Specific Messages Query

```typescript
// Alternative approach using array indexing in useSessionMessages.ts
const { docs: sessionMessages } = useLiveQuery((doc) => [doc.type, doc.session_id], {
  prefix: ['user-message', sessionId],
});

const { docs: aiMessages } = useLiveQuery((doc) => [doc.type, doc.session_id], {
  prefix: ['ai-message', sessionId],
});
```

**Purpose:** More efficient direct query for messages of a specific session.

**Parameters:**

- First parameter: A custom index function that returns `[doc.type, doc.session_id]`
- Second parameter: Query options with `prefix: ['user-message', sessionId]` or `prefix: ['ai-message', sessionId]`

**Usage:** This pattern is more efficient for querying by both type and session ID, particularly for larger databases, as it directly filters by both criteria.

## Query Optimization Notes

1. **Indexes:** Fireproof automatically creates indexes on each field, but compound indexes (like `type+session_id`) would need to be explicitly defined for optimal performance.

2. **Query Parameters:**

   - `limit` - Always include reasonable limits to prevent loading too many documents
   - `descending` - Use for chronological display (newest first)
   - `startkey`/`endkey` - Could be used for pagination or date range filters

3. **Post-Query Processing:**

   - Filtering: Further filter results by `session_id` in application code
   - Sorting: Sort by `created_at` field for chronological message display
   - Grouping: Group messages by sender for improved UX

4. **Performance Considerations:**
   - For larger applications, consider using more specific indices
   - Use compound indices for frequently combined query parameters
   - Consider pagination for very long message threads

By leveraging these query patterns, the application can efficiently retrieve and display sessions, messages, and screenshots while maintaining responsive performance and real-time updates.

## Code Study Plan

To understand and implement the described architecture, review these key files:

### Core Session Management

1. **app/hooks/useSession.ts**

   - Examine the `useDocument()` implementation for session creation
   - Look for `createSession()` and `updateTitle()` functions
   - Check how session state is exposed to components

2. **app/routes/home.tsx**

   - Understand the entry point and session initialization
   - Trace how `sessionId` is managed in component state
   - Identify event handlers for chat interactions

3. **app/routes/session.tsx**
   - Compare with home.tsx to understand session loading
   - Look for differences in handling existing vs. new sessions

### Message Management

4. **app/hooks/useSessionMessages.ts**

   - Examine `database.put()` calls for message creation
   - Look for the filtering of messages by `session_id`
   - Check message structure and how they link to sessions

5. **app/hooks/useSimpleChat.ts**
   - Understand the streaming implementation
   - Study how `streamBufferRef` manages in-memory content
   - Look for the completion detection that triggers database writes

### UI Components

6. **app/components/SessionSidebar.tsx**

   - Find the `useLiveQuery` implementation for sessions and screenshots
   - Study the grouping logic that associates screenshots with sessions
   - Look for sort order implementation (newest first)

7. **app/components/MessageList.tsx**

   - Examine how messages are fetched and filtered
   - Check the rendering logic for different message types
   - Look for handling of streaming vs. completed messages

8. **app/ChatInterface.tsx**
   - Understand how the main UI orchestrates all components
   - Look for state propagation between components

### Screenshot Management

9. **app/components/ResultPreview/** (directory)
   - Check the screenshot capture implementation
   - Look for `database.put()` calls with `type: 'screenshot'`
   - Understand how screenshots are linked to sessions

### Implementation Strategy

1. Start with session creation and management
2. Implement basic message saving without streaming
3. Add the session sidebar with live queries
4. Implement the message list with live queries
5. Add streaming support with in-memory buffers
6. Implement screenshot capture and association
7. Refine UI components for proper rendering

By following this study plan and implementing each part incrementally, you'll build a system that aligns with the document-oriented architecture while maintaining clean separation of concerns.
