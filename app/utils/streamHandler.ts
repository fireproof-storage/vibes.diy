/**
 * Utility functions for working with AI models via call-ai library
 */

import { CALLAI_API_KEY } from '../config/env';
import { callAI, type Message } from 'call-ai';

/**
 * Call AI model with streaming enabled using call-ai library
 *
 * @param model - The model to use (e.g. 'anthropic/claude-3.7-sonnet')
 * @param systemPrompt - The system prompt
 * @param messageHistory - Array of previous messages
 * @param userMessage - The current user message
 * @returns A Response object with the stream
 */
export async function callAIWithStream(
  model: string,
  systemPrompt: string,
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<Response> {
  try {
    // Format messages for call-ai
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messageHistory,
      { role: 'user', content: userMessage },
    ];

    // Configure call-ai options
    const options = {
      apiKey: CALLAI_API_KEY,
      model: model,
      // Using OpenRouter endpoint
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      stream: true,
      headers: {
        'HTTP-Referer': 'https://vibes.diy',
        'X-Title': 'Vibes DIY',
      },
      // Setting skipRetry to false allows automatic fallback
      skipRetry: false,
    };

    // Get the streamed response generator from call-ai
    // call-ai will handle model validation and fallback automatically
    const streamingGenerator = callAI(messages, options);

    // Create a TransformStream to convert the generator into a web standard Response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process the stream in the background
    (async () => {
      try {
        for await (const chunk of streamingGenerator as AsyncGenerator<string>) {
          // Format each chunk as Server-Sent Events (SSE)
          const data = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
          const sseMessage = `data: ${data}\n\n`;
          await writer.write(encoder.encode(sseMessage));
        }
      } catch (error) {
        console.error('Error processing stream:', error);
      } finally {
        await writer.close();
      }
    })();

    // Return a standard Response object with the readable stream
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in callAIWithStream:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use callAIWithStream instead
 */
export async function callOpenRouterAPI(
  model: string,
  systemPrompt: string,
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<Response> {
  return callAIWithStream(model, systemPrompt, messageHistory, userMessage);
}

/**
 * Process a streaming response from OpenRouter API
 *
 * @param response - The fetch response object with streaming enabled
 * @param onChunk - Callback function that receives each content chunk as it arrives
 * @returns A promise that resolves when streaming is complete
 */
export async function processStream(
  response: Response,
  onChunk: (content: string) => void
): Promise<void> {
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

  // Function will naturally resolve when streaming is complete
}
