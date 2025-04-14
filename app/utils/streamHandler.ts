/**
 * Utility functions for working with AI models via call-ai library
 */

import { callAI } from 'call-ai';

// Define our own Message type to support system messages
type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

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
  // NOTE FOR call-ai ENGINEER: We need 'system' role support in messageHistory, not just the initial system prompt
  // This is a type workaround - at runtime, we're sending system messages directly

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(messageHistory as any[]), // Type workaround - system messages work at runtime but not in types
    { role: 'user', content: userMessage },
  ] as Message[];
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
    const generator = callAI(messages, options) as AsyncGenerator<string>;

    // Process the stream - callAI already accumulates content
    let finalResponse = '';

    try {
      for await (const content of generator) {
        // Each yielded content already contains the full accumulated text
        finalResponse = content;
        onContent(content);
      }
      return finalResponse;
    } catch (streamError) {
      throw streamError;
    }
  } catch (initialError) {
    throw initialError;
  }
}
