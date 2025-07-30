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

## Long-term Vision

This architecture sets us up for several future improvements:

1. **Real-time Collaboration**:
   - Multiple users can interact with the same session
   - Changes are synchronized across clients

2. **Advanced Document Types**:
   - File attachments linked to sessions

3. **Enhanced UI Features**:
   - Message reactions/annotations
   - Message editing with history
   - Message threading/replies

The session-based architecture with individual message documents provides a solid foundation for a more scalable, maintainable, and feature-rich application.

## Remaining Steps Before Merging

Based on the changes implemented so far, these are the specific steps required to complete the session management refactoring before merging:

1. **Update MessageList Component**:
   - Refactor the MessageList component to use useSessionMessages instead of receiving props
   - Implement real-time message updates with useLiveQuery results
   - Handle message ordering and grouping

2. **Migrate Session & Home Routes**:
   - Update the session.tsx route to use useSession and useSessionMessages directly
   - Update the home.tsx route to handle new session creation with the new pattern
   - Remove legacy handleScrollToBottom references and other direct database access

3. **Update ChatInterface**:
   - Remove the deprecated SessionDocument interface from ChatInterface.tsx
   - Use the proper imported types from app/types/chat.ts
   - Migrate to the new hook pattern for session management

4. **No Migration Strategy**:
   - There is no legacy data to migrate

5. **Comprehensive Testing**:
   - Complete test suite for useSessionMessages
   - Test the migration strategy with various session formats
   - Test the complete flow from UI to database and back
   - Verify real-time updates across components

6. **Performance Optimization**:
   - Its fast enough for now, get it simple first

7. **Clean Up**:
   - Remove compatibility layers once all components are migrated
   - Remove unused code and references to old patterns
   - Standardize error handling across hooks

After completing these steps, the new session management system will be fully integrated, providing a more maintainable, performant, and flexible foundation for future features.

## Implementation Status Update (Latest)

### SessionSidebar Improvements

- ✅ Updated the SessionSidebar component to use a more efficient query pattern for types
- ✅ Changed from `doc.type === 'screenshot' ? doc.session_id : doc._id` to `doc.type === 'session' ? doc._id : doc.session_id`
- ✅ This allows for better identification of session documents vs. subdocuments
- ✅ Added proper type handling for documents that may not have the session_id property
- ✅ All tests for the SessionSidebar component are passing

### Additional Type Field Requirements

The 'type' field has been properly added in:

- ✅ SessionDocument interface in app/types/chat.ts
- ✅ Initial document creation in useSession.ts
- ✅ Session update operations in useSession.ts

The type field is already properly being used in:

- useSession hook - Setting type: 'session' in both initial state and updates
- useSessionMessages hook - Setting type: 'message' for both user and AI messages
- addScreenshot function - Setting type: 'screenshot' when adding screenshots

### Current Testing Issues

The useSimpleChat tests are currently failing, but these failures are unrelated to our SessionSidebar changes:

1. **Mock Response Issues**: The tests expect specific content like 'Exoplanet Tracker' in AI responses but are receiving generic 'Hello! How can I help you today?' responses instead.

2. **Content Validation**: All 7 failing tests are attempting to validate content in AI responses that isn't being correctly mocked.

3. **Test Environment Setup**: The mock functions for fetch and streaming responses may need to be updated to properly handle the expected AI response format.

The core functionality changes for SessionSidebar are working correctly as demonstrated by the passing SessionSidebar tests.

## Next Steps

1. Continue with the remaining refactoring tasks in the previous list
2. Focus on fixing the useSimpleChat test suite to handle AI responses correctly
3. Consider updating the test mocks to better represent the actual streaming response format

With these session improvements, the architecture now allows for more flexible document types all connected to the session, advancing the goals of better separation of concerns and centralized database access.

## Improved UI State Management Plan

### Issue

The UI currently relies on an `isGenerating` flag to determine when to show the "Thinking" state. However, this can lead to situations where the UI appears stuck in the "Thinking" state even when content has been received.

### Solution: Content-Based UI State

We will replace the `isGenerating` boolean flag with direct checks against message content and segments. This approach has several advantages:

- More direct connection between UI state and actual content
- Eliminates synchronization issues between state variables
- Makes the code more predictable since it's based on content rather than a separate flag

### Implementation Plan

1. **Remove `isGenerating` from `useSimpleChat` Return Value**:
   - No longer expose this as part of the hook's public API
   - Rely on the presence of streaming messages instead

2. **Update UI Components**:
   - Replace all instances of `isGenerating` with segment-based checks
   - For showing typing indicators: `messages.some(msg => msg.type === 'ai' && (msg as AiChatMessage).isStreaming)`
   - For input disabling: Same as above
   - For ResultPreview: `currentSegments().length > 0`

3. **Improve Content Display**:
   - Show content in ResultPreview as soon as segments are available
   - Transition smoothly from "Thinking" to content display
   - Maintain visual feedback during ongoing streaming

4. **Keyboard Event Handling**:
   - Replace `!isGenerating` check with direct message state check
   - Prevent message sending while any AI message is in streaming state

This change will eliminate the "stuck thinking" UI issue by making the display respond directly to the availability of content rather than a separate state variable that might not be correctly synchronized.

### Benefits

- Simplifies the code by removing a layer of state management
- Creates a more reactive UI that responds directly to content
- Fixes the "stuck thinking" issue by directly tying display to segment availability
- More resilient approach that's less prone to synchronization issues

I've added the UI state management plan to session-fireproof.md. The plan outlines how we'll improve the application by replacing the isGenerating flag with direct checks against message content and segments.
This content-based approach will:
Fix the "stuck thinking" UI issue by responding directly to content availability
Simplify the code by removing an unnecessary state variable
Make the interface more reactive and predictable
Reduce the potential for state synchronization issues
The implementation focuses on four key areas:
Removing isGenerating from the hook's API
Updating UI components to use segment-based checks
Improving content display to show results as soon as segments are available
Modifying keyboard event handling to rely on message state
This change aligns well with the overall architecture described in the document, which emphasizes separation of concerns and reactive UI components that respond directly to data changes.
