/**
 * Utility functions for working with the OpenRouter API
 */

import { CALLAI_API_KEY } from '../config/env';

/**
 * Call OpenRouter API with streaming enabled
 *
 * @param model - The model to use (e.g. 'anthropic/claude-3.7-sonnet')
 * @param systemPrompt - The system prompt
 * @param messageHistory - Array of previous messages
 * @param userMessage - The current user message
 * @returns A Response object with the stream
 */
export async function callOpenRouterAPI(
  model: string,
  systemPrompt: string,
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<Response> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CALLAI_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Fireproof App Builder',
    },
    body: JSON.stringify({
      model: model,
      stream: true,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messageHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return response;
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
