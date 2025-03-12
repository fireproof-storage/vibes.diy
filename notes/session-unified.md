# Streaming Data Flow Proposal

After reviewing the codebase and understanding the issue, I can see the fundamental problem: we're storing raw message content in the database during streaming, but components need access to parsed content for proper rendering.

## Simplest Solution: Enhanced Hook Approach

I propose enhancing our hooks to maintain both database state and streaming state. Here's the simplest approach that fits our existing architecture:

### 1. Modify useSessionMessages hook

```typescript:app/hooks/useSessionMessages.ts
export function useSessionMessages(sessionId: string | null) {
  // Existing database query logic
  const { db } = useFireproof();
  const messages = useLiveQuery(...);

  // Add state for current streaming message
  const [streamingMessage, setStreamingMessage] = useState<AiChatMessage | null>(null);

  // Enhanced addAiMessage function
  const addAiMessage = async (
    rawMessage: string,
    timestamp: number | null = null,
    isStreaming: boolean = false
  ) => {
    // Create the database document (no isStreaming flag in DB)
    const aiDoc = {
      type: 'message',
      message_type: 'ai',
      session_id: sessionId,
      raw_content: rawMessage,
      timestamp: timestamp || Date.now()
    };

    // Save to database (same as before)
    await db.put(aiDoc);

    // If streaming, also parse and keep in memory
    if (isStreaming) {
      const { segments, dependenciesString } = parseContent(rawMessage);
      setStreamingMessage({
        type: 'ai',
        text: rawMessage,
        segments,
        dependenciesString,
        isStreaming: true,
        timestamp: aiDoc.timestamp
      } as AiChatMessage);
    } else {
      // Clear streaming message when done
      setStreamingMessage(null);
    }
  };

  // Combine database messages with streaming message
  const combinedMessages = useMemo(() => {
    if (!streamingMessage) return messages;

    // Replace the database version of the streaming message with memory version
    return messages.map(msg => {
      if (msg.type === 'ai' && msg.timestamp === streamingMessage.timestamp) {
        return streamingMessage;
      }
      return msg;
    });
  }, [messages, streamingMessage]);

  return {
    // Return combined messages instead of just database messages
    messages: combinedMessages,
    addUserMessage,
    addAiMessage
  };
}
```

### 2. Modify useSimpleChat to use enhanced hook

```typescript:app/hooks/useSimpleChat.ts
// Inside the streaming while loop
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

          // This will update both database AND memory state
          // Messages in components will render from the parsed memory version
          await addAiMessage(streamBufferRef.current, aiMessageTimestampRef.current, true);
        }
      } catch (e) {
        console.error('Error parsing SSE JSON:', e);
      }
    }
  }
}

// After streaming completes (in the try block)
// Final update with isStreaming=false (uses database version)
await addAiMessage(streamBufferRef.current, aiMessageTimestampRef.current);
```

### 3. Update components to handle combined messages

Components like MessageList and ResultPreview will automatically receive the parsed, in-memory version of streaming messages through `useSessionMessages`. This means:

- No changes needed to how components consume messages
- They'll get real-time updates with parsed segments during streaming
- Once streaming ends, they'll seamlessly transition to using database content

## Benefits of this Approach

1. **Minimal changes** to existing architecture - we're enhancing existing hooks, not changing paradigms
2. **No Context API overhead** - keeps state management in hooks as before
3. **Clean separation of concerns**:
   - Database still only stores raw content (no streaming flags)
   - Streaming state exists only in memory
   - Components get pre-parsed data
4. **Consistent data flow** - all messaging still flows through the same hooks

## Updated Implementation Plan

Based on the understanding that the current streaming message is always the most recent, we can simplify the implementation:

### Step 1: Modify useSessionMessages.ts

1. Add state for tracking streaming message:

   ```typescript
   const [streamingMessage, setStreamingMessage] = useState<AiChatMessage | null>(null);
   ```

2. Update the `addAiMessage` function to handle streaming:

   ```typescript
   const addAiMessage = async (
     rawMessage: string,
     created_at?: number,
     isStreaming: boolean = false
   ) => {
     if (!sessionId) return null;

     try {
       const timestamp = created_at || Date.now();

       // Always create the same database document - no streaming flag in DB
       const result = await database.put({
         type: 'ai-message',
         session_id: sessionId,
         rawMessage,
         created_at: timestamp,
       } as AiMessageDocument);

       // For streaming, keep parsed version in memory
       if (isStreaming) {
         const { segments, dependenciesString } = parseContent(rawMessage);
         setStreamingMessage({
           type: 'ai',
           text: rawMessage,
           segments,
           dependenciesString,
           isStreaming: true,
           timestamp,
         } as AiChatMessage);
       } else {
         setStreamingMessage(null);
       }

       return timestamp;
     } catch (error) {
       console.error('Error adding AI message:', error);
       return null;
     }
   };
   ```

3. Simplify the combinedMessages logic:

   ```typescript
   const combinedMessages = useMemo(() => {
     if (!streamingMessage) return messages;
     return [...messages, streamingMessage];
   }, [messages, streamingMessage]);
   ```

4. Update the return value:
   ```typescript
   return {
     messages: combinedMessages,
     isLoading: !docs,
     addUserMessage,
     addAiMessage,
   };
   ```

### Step 2: Modify useSimpleChat.ts

Inside the streaming loop, continuously update the streaming message:

```typescript
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const data = JSON.parse(line.substring(6));
        if (data.choices && data.choices[0]?.delta?.content) {
          const content = data.choices[0].delta.content;
          streamBufferRef.current += content;
          await addAiMessage(streamBufferRef.current, aiMessageTimestampRef.current, true);
        }
      } catch (e) {
        console.error('Error parsing SSE JSON:', e);
      }
    }
  }
}

// Final update without streaming flag
await addAiMessage(streamBufferRef.current, aiMessageTimestamp);
setStreamingState(false);
```

### Step 3: Update ResultPreview.tsx

Ensure ResultPreview prioritizes streaming content:

```typescript
const codeToUse = streamingCode || code;
```

### Step 3: Update ChatHeader.tsx

Remove disabled state based on streaming:

```typescript
<button
  type="button"
  onClick={handleNewChat}
  className="peer bg-accent-02-light dark:bg-accent-02-dark hover:bg-accent-03-light dark:hover:bg-accent-03-dark flex cursor-pointer items-center justify-center rounded-full p-2.5 text-white transition-colors"
  aria-label="New Chat"
  title="New Chat"
>
  <span className="sr-only">New Chat</span>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
</button>
```

### Step 3: Test and Refine

Test thoroughly to ensure:

- Immediate streaming updates
- Correct final message persistence
- Smooth UI transitions

This simplified approach leverages the fact that the current streaming message is always the most recent, eliminating the need for complex timestamp matching.

## Final Notes

- This implementation preserves our core architecture while enabling real-time streaming updates
- We maintain the separation between database storage (raw content only) and UI representation (parsed with streaming flags)
- The approach minimizes changes to consumer components while providing immediate content updates
- By using message timestamps as identity keys, we ensure proper matching between streaming and final messages

Implementation should begin with the hook modifications, then update the streaming loop, and finally refine component interactions as needed.
