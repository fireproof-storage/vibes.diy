# Session Management Refactoring

## Goals

The primary goal is to refactor the database interaction logic to:

1. Centralize database access through custom hooks
2. Create a clearer separation of concerns
3. Implement a session-based architecture where each session can have multiple document types
4. Make the MessageList component populate itself from a useLiveQuery
5. Allow for a more flexible data model with individual documents per message
6. Improve the React render tree by only re-rendering components when their specific data changes

## Current Progress

We've made significant progress with the implementation of three key components:

1. **useSession** - ✅ Complete & Enhanced
   - Updated to use Fireproof's `useDocument` hook for reactive session management
   - Handles session metadata (title, etc.)
   - Provides access to the database
   - Manages session loading, updating and creation
   - Added comprehensive test suite

2. **useSessionMessages** - ✅ Complete
   - Stores messages as separate documents with session_id field
   - Uses different document structures for user vs. AI messages
   - Preserves raw AI message content for future reparsing
   - Uses Fireproof live query for reactive updates

3. **useSimpleChat** - ✅ Updated
   - Now uses useSession and useSessionMessages
   - Handles message generation and title creation
   - Manages streaming content with appropriate database updates
   - Added compatibility layer for older components

## Key Design Decisions

### Raw Message Storage
For AI messages, we're storing the raw stream content rather than the parsed result. This allows:
- Future improvements to parsing logic can be applied to existing messages
- Original content is preserved regardless of parsing changes
- More flexibility in how we display messages in the UI

### Separation of Concerns
- **Session**: Metadata, title, management
- **Messages**: Individual documents linked to a session via session_id
- **UI Components**: Focus on rendering, not data management

### Leveraging Fireproof Hooks
We're now using Fireproof's built-in React hooks for better integration:
- **useDocument**: For reactive session management with automatic merge/save operations
- **useLiveQuery**: For reactive message lists that update in real-time

### Message Document Structure
We've implemented two distinct document types:
1. **User Message**:
   ```typescript
   {
     type: 'message',
     message_type: 'user',
     session_id: string,
     text: string,
     timestamp: number
   }
   ```

2. **AI Message**:
   ```typescript
   {
     type: 'message',
     message_type: 'ai',
     session_id: string,
     raw_content: string,
     timestamp: number,
     title_generated?: boolean
   }
   ```

## Current Issues

The implementation has several issues that need to be addressed:

### Type Issues
- ✅ Fixed: Missing types module - updated import paths to use `../types/chat` 
- ✅ Fixed: Added 'type' field to SessionDocument interface
- ✅ Fixed: TypeScript errors with Fireproof API usage 

### Fireproof API Issues
- ✅ Fixed: `useDatabase` doesn't exist - updated to use the correct `useFireproof` approach
- ✅ Fixed: Fireproof query syntax updated to use official patterns with type and key parameters

## Next Steps

1. **Update UI Components**:
   - Refactor MessageList to use useSessionMessages
   - Update session.tsx and home.tsx routes to use the new hooks
   - Remove any direct database access from components

2. **Data Model Migration**:
   - Create a migration function to convert existing sessions to the new format
   - Add a compatibility layer for reading legacy session format

3. **Testing**:
   - ✅ Added tests for useSession hook
   - Add tests for useSessionMessages hook
   - Test migration from old to new format

4. **Performance Optimization**:
   - Add indexes for efficient querying
   - Consider pagination for large message lists
   - Optimize query patterns

## Long-term Vision

This architecture sets us up for several future improvements:

1. **Real-time Collaboration**:
   - Multiple users can interact with the same session
   - Changes are synchronized across clients

2. **Advanced Document Types**:
   - Code snippets as individual documents
   - File attachments linked to sessions
   - References between documents
 
3. **Enhanced UI Features**:
   - Message reactions/annotations
   - Message editing with history
   - Message threading/replies

The session-based architecture with individual message documents provides a solid foundation for a more scalable, maintainable, and feature-rich application.
