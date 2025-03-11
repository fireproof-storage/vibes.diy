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

We've started implementing the refactoring with two new hooks:

1. **useSession**: Centralizes session data management
2. **useSessionMessages**: Handles message-specific operations with reactive updates

And we've modified:
- **useSimpleChat**: To use the new hooks instead of direct database access

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

## Current Issues

The implementation has several issues that need to be addressed:

### Type Issues
- ✅ Fixed: Missing types module - updated import paths to use `../types/chat` 
- ⚠️ In Progress: TypeScript errors with Fireproof API usage 

### Fireproof API Issues
- ✅ Fixed: `useDatabase` doesn't exist - updated to use the correct `useFireproof` approach
- ⚠️ In Progress: Fireproof query syntax needs refinement - updated query pattern but still resolving type errors

## Next Steps

1. **Fix Remaining Type Issues**:
   - Address type issues with Fireproof query in useSessionMessages

2. **Fix Message Data Model**:
   - ✅ Done: Updated to store raw AI message content
   - ✅ Done: Separate user and AI message document types
   - ✅ Done: Added reparsing at the component level

3. **Complete the Migration**:
   - Update useSimpleChat to use the new message format
   - Refactor MessageList to consume messages from useSessionMessages
   - Update routes to handle session creation/loading

4. **Data Model Transition**:
   - Create a migration function to convert existing sessions to the new format
   - Implement backwards compatibility for legacy data

5. **Testing**:
   - Update tests to account for the new architecture
   - Create new tests for the hooks

## Long-term Vision

The goal is to have a system where:

1. Each session is a lightweight document containing metadata
2. Messages are stored as separate documents linked to sessions by session_id
3. Additional document types (screenshots, generated files, etc.) can be associated with sessions
4. Components can subscribe to only the data they need
5. Updates are efficient and targeted

This architecture will make the application more maintainable, more performant, and easier to extend with new features.
