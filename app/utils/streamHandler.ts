/**
 * Utility functions for working with AI models via call-ai library
 */

import { type Message, callAI } from 'call-ai';

/**
 * Stream AI responses with accumulated content callback
 *
 * @param model - The model to use (e.g. 'anthropic/claude-sonnet-4')
 * @param systemPrompt - The system prompt
 * @param messageHistory - Array of previous messages
 * @param userMessage - The current user message
 * @param onContent - Callback function that receives the accumulated content so far
 * @param apiKey - The API key to use for the callAI service
 * @param userId - The user ID
 * @param setNeedsLogin - Optional callback to set needs login flag
 * @returns A promise that resolves to the complete response when streaming is complete
 */
export async function streamAI(
  model: string,
  systemPrompt: string,
  messageHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userMessage: string,
  onContent: (content: string) => void,
  apiKey: string,
  userId?: string,
  setNeedsLogin?: (value: boolean) => void
): Promise<string> {
  // Stream process starts

  // Format messages for call-ai
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...messageHistory,
    { role: 'user', content: userMessage },
  ];
  // Configure call-ai options with default maximum token limit
  const defaultMaxTokens = userId ? 150000 : 75000;
  const options = {
    apiKey: apiKey,
    model: model,
    transforms: ['middle-out'],
    stream: true,
    max_tokens: defaultMaxTokens,
    debug: false, // Disable debugging logs
    headers: {
      'HTTP-Referer': 'https://vibes.diy',
      'X-Title': 'Vibes DIY',
    },
  };

  // If available, check if credits should constrain max_tokens
  try {
    const { getCredits } = await import('../config/provisioning');
    const credits = await getCredits(apiKey);
    if (credits && credits.available) {
      // Convert available credits to tokens (rough approximation)
      const tokensFromCredits = Math.floor(credits.available * 1000000); // Each credit roughly equals 1M tokens
      // Only reduce max_tokens if credits constrain it below the default maximum
      if (tokensFromCredits < defaultMaxTokens) {
        options.max_tokens = tokensFromCredits;
        console.log(
          `Constraining max_tokens to ${options.max_tokens} based on available credits: ${credits.available}`
        );
      } else {
        console.log(
          `Using default max_tokens: ${defaultMaxTokens} (credits available: ${credits.available})`
        );
      }
    }
  } catch (error) {
    // If we can't check credits, just use the default max_tokens
    console.warn('Could not check credits for max_tokens adjustment:', error);
  }

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
        // Failed to even start streaming

        // Format a user-friendly error message for toast
        // const errorMsg = streamError instanceof Error ? streamError.message : String(streamError);
        // const toastMsg = `Error during AI response: ${errorMsg}`;
        // console.log('[TOAST MESSAGE]', toastMsg);

        // Check if this is an authentication error
        // if (
        //   errorMsg.includes('authentication') ||
        //   errorMsg.includes('key') ||
        //   errorMsg.includes('token') ||
        //   errorMsg.includes('credits')
        // ) {
        //   if (setNeedsLogin) {
        //     setNeedsLogin(true);
        //   }
        // }

        // Don't return any message to the chat, let the caller handle it
        return '';
      }
    } else {
      throw new Error('Unexpected response type from callAI');
    }
  } catch (initialError) {
    // Failed to even start streaming

    // Format a user-friendly error message for toast
    // const errorMsg = initialError instanceof Error ? initialError.message : String(initialError);
    // const toastMsg = `Error starting AI response: ${errorMsg}`;
    // console.warn('[TOAST MESSAGE]', toastMsg);

    // Check if this is an authentication error
    // if (
    //   errorMsg.includes('authentication') ||
    //   errorMsg.includes('key') ||
    //   errorMsg.includes('token') ||
    //   errorMsg.includes('credits')
    // ) {
    //   console.warn('Setting needs login due to auth/credit error');
    //   if (setNeedsLogin) {
    //     setNeedsLogin(true);
    //   }
    // }

    // Don't return any message to the chat, let the caller handle it
    return '';
  }
}
