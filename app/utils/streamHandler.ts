/**
 * Utility functions for working with AI models via call-ai library
 */

import { callAI, type Message } from 'call-ai';

/**
 * Stream AI responses with accumulated content callback
 *
 * @param model - The model to use (e.g. 'anthropic/claude-3.7-sonnet')
 * @param systemPrompt - The system prompt
 * @param messageHistory - Array of previous messages
 * @param userMessage - The current user message
 * @param onContent - Callback function that receives the accumulated content so far
 * @param apiKey - The API key to use for the callAI service
 * @returns A promise that resolves to the complete response when streaming is complete
 */
export async function streamAI(
  model: string,
  systemPrompt: string,
  messageHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userMessage: string,
  onContent: (content: string) => void,
  apiKey: string
): Promise<string> {
  // Stream process starts

  // Format messages for call-ai
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...messageHistory,
    { role: 'user', content: userMessage },
  ];
  // Configure call-ai options
  const options = {
    apiKey: apiKey,
    model: model,
    stream: true,
    debug: false, // Disable debugging logs
    headers: {
      'HTTP-Referer': 'https://vibes.diy',
      'X-Title': 'Vibes DIY',
    },
  };

  try {
    const response = await callAI(messages, options);

    // Process the stream - handle both string and StreamResponse cases
    let finalResponse = '';

    if (typeof response === 'string') {
      // Handle direct string response
      finalResponse = response;
      onContent(response);
      return finalResponse;
    } else if (response && typeof response === 'object') {
      // Handle StreamResponse object - assuming it's an async generator
      try {
        const generator = response as AsyncGenerator<string>;
        for await (const content of generator) {
          // Each yielded content already contains the full accumulated text
          finalResponse = content;
          onContent(content);
        }
        return finalResponse;
      } catch (streamError) {
        throw streamError;
      }
    } else {
      throw new Error('Unexpected response type from callAI');
    }
  } catch (initialError) {
    throw initialError;
  }
}
