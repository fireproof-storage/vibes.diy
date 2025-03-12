import { parseContent } from './segmentParser';

// Debug logging function
function logDebug(message: string) {
  console.debug(`🔍 STREAM_HANDLER: ${message}`);
}

/**
 * Process a streaming response from OpenRouter API
 * 
 * @param response - The fetch response object with streaming enabled
 * @param onChunk - Callback function that receives each content chunk as it arrives
 * @param onComplete - Callback function called when streaming is complete
 * @param onError - Callback function called if an error occurs
 * @returns A promise that resolves when streaming is complete
 */
export async function processStream(
  response: Response,
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();

    // Process the stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });

      // Process SSE format
      const lines = chunk.split('\n');
      for (const line of lines) {
        // Skip OpenRouter processing messages
        if (line.startsWith(': OPENROUTER PROCESSING')) {
          continue;
        }

        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.choices && data.choices[0]?.delta?.content) {
              const content = data.choices[0].delta.content;
              // Call the onChunk callback with the new content
              onChunk(content);
            }
          } catch (e) {
            console.error('Error parsing SSE JSON:', e);
          }
        }
      }
    }

    // Streaming is complete
    onComplete();
  } catch (error) {
    // Handle and propagate errors
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error processing stream:', err);
    onError(err);
  }
}

/**
 * Update streaming message with new content
 * This handles parsing the content into segments and logging
 * 
 * @param rawMessage - The complete message content so far
 * @param addAiMessage - Function to add/update the AI message in storage
 */
export function updateStreamingMessage(
  rawMessage: string,
  addAiMessage: (text: string, created_at: number, isStreaming: boolean) => Promise<any>,
  messages: any[] = []
): void {
  console.debug(`🔍 UPDATE_STREAMING: length=${rawMessage.length}`);

  // Only process messages with actual content
  if (!rawMessage || rawMessage.trim().length === 0) {
    console.debug('🔍 EMPTY MESSAGE: Skipping empty streaming update');
    return;
  }

  // Ensure we properly parse content into segments
  const { segments, dependenciesString } = parseContent(rawMessage);

  // Log what segments we parsed
  console.debug(`🔍 PARSED ${segments.length} SEGMENTS for streaming message`);

  // Enhanced logging for debugging
  if (segments.length > 0) {
    segments.forEach((segment, i) => {
      console.debug(`  Segment ${i}: type=${segment.type}, length=${segment.content.length}`);
      // Add sample of content for debugging
      console.debug(`  Sample: "${segment.content.substring(0, Math.min(30, segment.content.length))}..."`);
    });
  }

  // CRITICAL FIX: Always create a simple markdown segment with the full content 
  // if no segments were parsed. This ensures content is shown immediately.
  if (segments.length === 0 && rawMessage.trim().length > 0) {
    segments.push({
      type: 'markdown',
      content: rawMessage,
    });
    console.debug('🔍 CREATED FALLBACK MARKDOWN SEGMENT from raw message text');
  }

  // Use addAiMessage with isStreaming=true to update in-memory message
  addAiMessage(rawMessage, Date.now(), true).catch(console.error);

  // After parsing segments, add logging about state updates
  logDebug(`Setting ${segments.length} segments to message state`);
  
  if (messages.length > 0) {
    logDebug(`Current messages count: ${messages.length}`);
    logDebug(`Updating messages state with ${messages.length} messages`);
    
    messages.forEach((msg, i) => {
      if (msg.type === 'ai') {
        const aiMsg = msg;
        logDebug(`  Message ${i}: type=${msg.type}, isStreaming=${aiMsg.isStreaming}, segments=${aiMsg.segments?.length || 0}, text length=${msg.text?.length || 0}`);
      } else {
        logDebug(`  Message ${i}: type=${msg.type}, text length=${msg.text?.length || 0}`);
      }
    });
  }
} 