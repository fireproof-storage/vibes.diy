## Streaming Fix Plan

I need to write a concise plan for fixing the streaming issues in the unified session component. Based on the analysis I provided earlier, I should outline actionable steps focused on immediate streaming content display without special handling. I'll formulate this plan following the principles mentioned in the "New Goals" section.

Key points to address:

1. Immediate content rendering instead of waiting for stream completion
2. Consistent content updates during streaming
3. Simple data flow from stream → parse → display
4. Eliminating special stream state handling in display components
5. Ensuring ResultPreview shows code as it arrives

### 1. Fix useSimpleChat Stream Processing

The core issue is in the streaming loop, where we're collecting content but not updating the AI message continuously. We need to:

```typescript
// Inside the streaming while loop in useSimpleChat.ts
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n');

  for (const line of lines) {
    if (line.startsWith('data:')) {
      try {
        const data = JSON.parse(line.substring(5));
        if (data.choices && data.choices[0].delta) {
          const content = data.choices[0].delta.content;
          // Add content to buffer
          streamBufferRef.current += content;

          // UPDATE: For each chunk, immediately update the AI message
          // This ensures the UI updates with each part of the stream
          await addAiMessage(streamBufferRef.current, aiMessageTimestampRef.current, true);

          // Log debugging info
          if (streamBufferRef.current.length % 20 === 0) {
            console.log('Stream buffer length:', streamBufferRef.current.length);
          }
        }
      } catch (e) {
        console.error('Error parsing SSE JSON:', e);
      }
    }
  }
}
```

The key change is adding the `addAiMessage` call within the streaming loop, which will continuously update the AI message in the database as new content arrives, with the `isStreaming` flag set to true.

### 2. Fix ResultPreview Code Display

ResultPreview has been simplified, but we need to ensure it always shows the most current code regardless of streaming state:

```typescript
// In ResultPreview.tsx
// Simplified code update logic - always use the most up-to-date code
useEffect(() => {
  // Clean the code and add whitespace
  const processCode = (sourceCode: string) => {
    return cleanCodeBeforeImport(sourceCode) + '\n\n\n\n\n\n\n\n\n\n';
  };

  // IMPORTANT: Prioritize streaming code when it exists, otherwise use static code
  const codeToUse = streamingCode || code;

  if (codeToUse) {
    console.log(
      'ResultPreview: Updating code, lengths - streamingCode:',
      streamingCode?.length || 0,
      'code:',
      code?.length || 0
    );
    const processedCode = processCode(codeToUse);
    setDisplayCode(processedCode);

    filesRef.current = {
      ...filesRef.current,
      '/App.jsx': {
        code: processedCode,
        active: true,
      },
    };

    setShowWelcome(false);

    // Show code view during streaming
    if (hasStreamingContent) {
      setActiveView('code');
      setLockCodeView(true);
    } else {
      setLockCodeView(false);
    }
  }
}, [code, streamingCode]);
```

The primary change is using direct content checks (`hasStreamingContent = Boolean(streamingCode && streamingCode.length > 0)`) instead of a separate `isStreaming` flag.

### 3. Fix MessageList Component

MessageList now uses useSessionMessages to get messages. We need to ensure it displays streaming content immediately:

```typescript
// In MessageList.tsx
// Check if there's a streaming message
const hasStreamingMessage = useMemo(() => {
  return messages.some(msg => msg.type === 'ai' && (msg as AiChatMessage).isStreaming);
}, [messages]);

// Only show typing indicator when no streaming message is visible yet
{isStreaming() && !hasStreamingMessage && <AITyping />}
```

### 4. Testing Plan

To verify the fixes work correctly:

1. Test complete data flow: Type a prompt → see immediate streaming updates
2. Check incremental code display: Code should appear in the editor as it streams in
3. Verify UI indicators: Typing indicator should be replaced by actual content
4. Test with variable network conditions: Streaming should work even with delays
5. Check both new sessions and existing sessions: Behavior should be consistent

### 5. Implementation Strategy

1. First fix the useSimpleChat streaming loop to update messages in real-time
2. Then update the ResultPreview component to always display the latest code
3. Finally ensure MessageList component responds to streaming messages properly
4. Test all fixes together to ensure they create a cohesive streaming experience

By implementing these changes, we'll restore the immediate feedback that existed in the branch point implementation while maintaining the new architecture's benefits of unified sessions.

## Additional Context from the Diff

For reference, here are key architectural changes in the unified session approach that are important to understand when implementing these fixes:

1. **Architecture Change**: We've consolidated home.tsx and session.tsx into a single unified-session.tsx component. This means all streaming functionality now needs to work through the same code path.

2. **Database and State Changes**:

   - Messages are now stored in Fireproof as individual documents with session_id fields
   - The useSessionMessages hook fetches messages directly rather than receiving them via props
   - Messages have an explicit isStreaming flag that UI components should check

3. **Hook Structure Changes**:

   ```typescript
   // Old approach
   export function useSimpleChat() {
     const [messages, setMessages] = useState<ChatMessage[]>([]);
     const [isGenerating, setIsGenerating] = useState(false);
     // ...
   }

   // New approach
   export function useSimpleChat(sessionId: string | null) {
     // Use our new hooks
     const { session, updateTitle } = useSession(sessionId);
     const { messages, addUserMessage, addAiMessage } = useSessionMessages(sessionId);
     // Track streaming with state + function
     const [streamingState, setStreamingState] = useState<boolean>(false);
     const isStreaming = useCallback((): boolean => {
       return streamingState;
     }, [streamingState]);
     // ...
   }
   ```

4. **API Changes**:

   - ResultPreview: `isStreaming` prop removed, uses `streamingCode` existence check instead
   - MessageList: `messages` prop replaced with `sessionId`, `isGenerating` replaced with `isStreaming()`
   - ChatHeader: `isGenerating` prop replaced with `isStreaming` function prop

5. **Key Fixed Files**: The core files changed in the diff are:
   - app/hooks/useSimpleChat.ts (message generation and streaming)
   - app/components/ResultPreview/ResultPreview.tsx (code display)
   - app/components/MessageList.tsx (message display)
   - app/routes.ts (consolidated routes)

These changes are essential to understand when implementing the streaming fixes to ensure compatibility with the new architecture.

## Clarification on isStreaming State Usage

After reviewing the codebase, there are several places where the `isStreaming` flag is used for legitimate purposes that can't be easily replaced by content presence checks. Here's an inventory of these usages:

1. **UI Controls and User Interaction**:

   - ✅ **Chat Input**: In `ChatInterface.tsx`, the Enter key submission is disabled during streaming to prevent sending new messages while a response is still being generated.
   - ❌ **New Chat Button**: Currently disabled during streaming in `ChatHeader.tsx`, but this can be removed to allow users to start a new chat at any time, even during streaming.

2. **Sandpack and Code Preview Behavior**:

   - ✅ **SandpackScrollController**: Needs the streaming state to enable auto-scrolling behavior and line highlighting during code generation. This is critical for user experience as it tracks new code being added.
   - ✅ **SandpackEventListener**: Uses streaming state to determine when to reset/initialize the sandbox and when to pause event processing.

3. **Message Rendering Logic**:

   - ✅ **AITyping Indicator**: In `MessageList.tsx`, the typing indicator should only show when streaming has started but no content has arrived yet. This requires both the global streaming state and message content checks.

4. **State Management**:

   - ✅ **Streaming State Reset**: At the end of streaming, we need an explicit flag to be turned off to trigger cleanup actions that wouldn't be triggered by content changes alone. These cleanup actions include:

     a. **Title Generation**: When streaming completes, we check for code in the generated response and trigger title generation if needed.

     b. **Error Handling**: If an error occurs during streaming, we need to reset the streaming state to allow new requests.

     c. **UI Transition & Cleanup**: Several UI elements need to know when streaming has finished completely: - `ResultPreview`: Unlocks the code view (`setLockCodeView(false)`) when streaming is done - `SandpackScrollController`: Clears highlight intervals and stops auto-scrolling - `SandpackEventListener`: Resumes normal event processing once streaming is done

     d. **Reference Cleanup**: The `aiMessageTimestampRef.current` is set to null in the `finally` block to avoid stale references.

     e. **Database State Completion**: The final AI message is updated with `isStreaming: false` to mark completion in the database.

     The full sequence in `useSimpleChat.ts` looks like:

     ```typescript
     try {
       // Streaming code...

       // When complete:
       await addAiMessage(streamBufferRef.current, aiMessageTimestamp); // Final message with isStreaming=false
       setStreamingState(false); // <-- Critical state reset

       // Post-streaming actions that depend on knowing streaming is done
       const { segments } = parseContent(streamBufferRef.current);
       const hasCode = segments.some((segment) => segment.type === 'code');

       if (hasCode && (!session?.title || session.title === 'New Chat')) {
         await generateTitle(aiMessageTimestamp, segments);
       }
     } catch (error) {
       console.error('Error calling OpenRouter API:', error);
       await addAiMessage(errorMessage);
       setStreamingState(false); // <-- Error state reset
     } finally {
       aiMessageTimestampRef.current = null; // <-- Reference cleanup
     }
     ```

## Important Note on Database Message Storage

An important principle to maintain: **Messages in the database should never have an `isStreaming` flag at all**.

1. Currently, the database correctly stores raw message content with no streaming flag: The `addAiMessage` function in `useSessionMessages.ts` only stores:

   ```typescript
   {
     type: 'ai-message',
     session_id: sessionId,
     rawMessage,
     created_at: timestamp
   }
   ```

   Note that there is no `isStreaming` field in this database record, which is exactly what we want.

2. The `isStreaming` property is added only as an in-memory attribute when constructing message objects from database documents:

   ```typescript
   return {
     type: 'ai',
     text: aiDoc.rawMessage,
     segments,
     dependenciesString,
     isStreaming: false, // Added in memory, not from database
     timestamp: aiDoc.created_at,
   } as AiChatMessage;
   ```

3. Our proposed fix's streaming implementation adds an optional third parameter to `addAiMessage` for in-memory representation only:

   ```typescript
   // UPDATE: For each chunk, immediately update the AI message
   await addAiMessage(streamBufferRef.current, aiMessageTimestampRef.current, true);
   ```

   This parameter should ONLY affect the in-memory message state and must NOT add any streaming flag to the database record.

4. The actual implementation must ensure that:
   - The database records never contain an `isStreaming` field
   - The `isStreaming` property exists only in memory during runtime
   - It's set to `true` only during active streaming
   - It's reset to `false` or removed once streaming completes

This separation maintains database consistency and simplicity while enabling the real-time UI updates we need.

**Recommendation**: Rather than eliminating the `isStreaming` flag entirely, we should:

1. Use content presence as the primary check for displaying content (principle of "streaming is not a special state")
2. Keep the `isStreaming` flag for legitimate UI control purposes (disable input, control Sandpack behavior)
3. Ensure the flag and content state remain synchronized by updating messages immediately when content arrives

This hybrid approach ensures responsive UI updates while maintaining necessary control behaviors where absolute state is required.
