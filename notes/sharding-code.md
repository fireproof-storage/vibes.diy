# Database Sharding Implementation

## Summary of Changes

This implementation introduces database sharding to improve performance and scalability. Instead of storing all chat data in a single database, the approach now uses:

- A main database (`getSessionsDatabase`) for storing session metadata
- Individual session-specific databases (`getSessionDatabase`) for storing messages, screenshots, and other content related to each session

## File Changes

### 1. app/hooks/sidebar/useSessionList.ts

- Completely rewrote session list retrieval logic to support database sharding
- Changed from a single query approach to a two-step process:
  - First query session metadata from main database
  - Then fetch screenshots for each session from session-specific databases
- Added proper loading state management with useState hooks
- Replaced useMemo with useEffect for asynchronous data fetching
- Added error handling for session database operations

### 2. app/hooks/useSession.ts

- Implemented database sharding architecture
- Created separate database instances:
  - `mainDatabase` for session metadata
  - `sessionDatabase` for session-specific content (messages, screenshots)
- Modified all database operations to use the appropriate database instance
- Updated session ID generation to be consistent between main and session databases
- Added explicit naming convention for session databases (`vibe-${sessionId}`)

### 3. app/hooks/useSimpleChat.ts

- Updated database references from `database` to `sessionDatabase`
- Added null check before persisting AI messages to session database
- Minor refactoring to support the sharded database architecture

### 4. app/prompts.ts

- Trivial styling change: replaced "orange synthwave vibe" with "pastel rainbow vibe"
- This change appears unrelated to the database sharding implementation

### 5. app/utils/databaseManager.ts (New File)

- Created new utility file to manage database connections
- Implemented three main functions:
  - `getSessionsDatabase()`: Returns the main database for session metadata
  - `getSessionDatabase(sessionId)`: Returns a session-specific database instance
  - `getSessionDatabaseName(sessionId)`: Generates consistent database names (`vibe-${sessionId}`)
- Added proper error handling for missing session IDs
