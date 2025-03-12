# Streaming Implementation Task

Your task is to implement the streaming functionality fixes for our AI app builder. This requires understanding our architecture and implementing specific changes to ensure real-time content updates during streaming.

## Background Reading

First, thoroughly read these two files to understand the context:

1. `@session-finish.md` - Contains our detailed implementation plan for fixing streaming issues, with specific code samples and explanations
2. `@session-fireproof.md` - Provides background on our session management architecture and database design

## Key Issues to Address

1. **Stream Processing**: Update `useSimpleChat.ts` to continuously update AI messages as stream chunks arrive
2. **Content Display**: Modify `ResultPreview.tsx` to prioritize and display streaming content immediately
3. **Message Rendering**: Update `MessageList.tsx` to properly handle streaming messages

## Implementation Requirements

- **Database Consistency**: The `isStreaming` flag must NEVER be stored in the database - it should only exist as an in-memory property
- **Real-time Updates**: Content must be displayed immediately as it streams in without waiting for completion
- **Hybrid Approach**: Use content presence as primary display determinant while maintaining necessary control flags
- **Proper Cleanup**: Ensure all streaming state is properly reset after completion

## Step-by-Step Approach

1. Modify `useSimpleChat.ts` first - add the continuous message updates in the streaming loop
2. Update `useSessionMessages.ts` to add the optional streaming parameter to `addAiMessage` (memory only)
3. Implement the ResultPreview changes to prioritize streaming content
4. Update MessageList to properly detect and render streaming messages
5. Test the complete flow and fix any issues

## Important Notes

- The current architecture already keeps streaming state out of the database - keep it that way
- We're taking a hybrid approach: content-based UI with some legitimate needs for state flags
- You can remove the disabled state on the New Chat button in ChatHeader.tsx
- The `isStreaming` flag is needed for specific UI behaviors (input disabling, Sandpack behavior)

Get started by reading the files, then implement each change. Run tests to verify your implementation works as expected.
