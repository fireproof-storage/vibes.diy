/**
 * Utility functions for working with AI models via call-ai library
 */

import { CALLAI_API_KEY } from '../config/env';
import { callAI, type Message } from 'call-ai';

/**
 * Stream AI responses with accumulated content callback
 *
 * @param model - The model to use (e.g. 'anthropic/claude-3.7-sonnet')
 * @param systemPrompt - The system prompt
 * @param messageHistory - Array of previous messages
 * @param userMessage - The current user message
 * @param onContent - Callback function that receives the accumulated content so far
 * @returns A promise that resolves to the complete response when streaming is complete
 */
export async function streamAI(
  model: string,
  systemPrompt: string,
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  onContent: (content: string) => void
): Promise<string> {
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
    stream: true,
    headers: {
      'HTTP-Referer': 'https://vibes.diy',
      'X-Title': 'Vibes DIY',
    },
  };

  const generator = callAI(messages, options) as AsyncGenerator<string>;

  // Process the stream - callAI already accumulates content
  let finalResponse = '';

  for await (const content of generator) {
    // Each yielded content already contains the full accumulated text
    finalResponse = content;
    // Call the callback with the content
    onContent(content);
  }

  return finalResponse;
}
