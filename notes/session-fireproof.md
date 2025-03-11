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

## Current Issues

The implementation has several issues that need to be addressed:

### Type Issues
- Missing types module (`../types`) - we need to update the import paths to use `../types/chat`
- TypeScript errors with Fireproof API usage

### Fireproof API Issues
- `useDatabase` doesn't exist in the Fireproof API - we should use the existing `useFireproof` approach
- Incorrect usage of `useLiveQuery` - need to reference the Fireproof documentation for correct patterns

## Next Steps

1. **Fix Type Imports**:
   - Update imports to use `../types/chat` instead of `../types`

2. **Fix Fireproof API Usage**:
   - Update `useSession` to use proper Fireproof API:
     ```typescript
     const { database } = useFireproof(FIREPROOF_CHAT_HISTORY);
     ```
   - Update `useSessionMessages` to use proper Fireproof API for queries

3. **Complete the Migration**:
   - Update components to use the new hooks
   - Refactor MessageList to use `useSessionMessages`
   - Update routes to handle session creation/loading

4. **Data Model Transition**:
   - Create a migration path from current "all messages in one doc" to "one doc per message"
   - Implement backwards compatibility for existing sessions

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
