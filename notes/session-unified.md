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

## Implementation Steps

1. First enhance `useSessionMessages` to track streaming message state and combine with database results
2. Update `useSimpleChat` to leverage this enhanced functionality
3. Test with components to verify they receive parsed content during streaming

This solution maintains our existing architecture while solving the streaming rendering issue in the simplest way possible.


