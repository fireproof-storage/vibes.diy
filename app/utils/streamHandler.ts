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
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  onContent: (content: string) => void,
  apiKey: string
): Promise<string> {
  console.log('streamAI: Starting with model:', model);
  
  // Format messages for call-ai
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...messageHistory,
    { role: 'user', content: userMessage },
  ];
  console.log('streamAI: Message history length:', messageHistory.length);

  // Configure call-ai options
  const options = {
    apiKey: apiKey,
    model: model,
    stream: true,
    headers: {
      'HTTP-Referer': 'https://vibes.diy',
      'X-Title': 'Vibes DIY',
    },
  };
  console.log('streamAI: API key present:', !!apiKey);
  console.log('streamAI: Using model:', model);

  console.log('streamAI: Calling API with callAI...');
  try {
    const generator = callAI(messages, options) as AsyncGenerator<string>;
    console.log('streamAI: Generator created successfully');

    // Process the stream - callAI already accumulates content
    let finalResponse = '';
    let chunkCount = 0;

    try {
      for await (const content of generator) {
        chunkCount++;
        // Each yielded content already contains the full accumulated text
        finalResponse = content;

        // Log a preview of the content periodically
        if (chunkCount % 10 === 0 || chunkCount < 3) {
          const preview = content.length > 100 ? 
            `${content.substring(0, 50)}...${content.substring(content.length - 50)}` : 
            content;
          console.log(`streamAI: Chunk #${chunkCount}, length: ${content.length}, preview: ${preview}`);
          
          // Check if the content looks like a JSON error
          if (content.includes('"error"') && content.includes('"code"')) {
            console.log('streamAI: Potential error in response:', content);
          }
        }

        // Call the callback with the content
        onContent(content);
      }
      console.log(`streamAI: Stream completed, received ${chunkCount} chunks, final length: ${finalResponse.length}`);
      return finalResponse;
    } catch (streamError) {
      console.error('streamAI: Error during streaming:', streamError);
      throw streamError;
    }
  } catch (initialError) {
    console.error('streamAI: Error creating generator:', initialError);
    throw initialError;
  }
}
