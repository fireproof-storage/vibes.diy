/**
 * CallAI key management utilities
 */

/**
 * Fetches the credit information for an API key
 * @param apiKey The API key to check credits for
 * @returns The credit information including available credits and usage
 */
export async function getCredits(apiKey: string): Promise<{
  available: number;
  usage: number;
  limit: number;
}> {
  try {
    // Validate the API key before making the request
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new Error('Invalid or missing API key');
    }

    // Use the auth/key endpoint to get information about the key itself
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Try to get more detailed error information
      let errorDetails = '';
      try {
        const errorData = await response.text();
        errorDetails = errorData ? ` - ${errorData}` : '';
      } catch (e) {}

      throw new Error(`Failed to fetch key credits: ${response.status}${errorDetails}`);
    }

    const responseData = await response.json();

    // Map the response to the expected format
    const data = responseData.data || responseData;
    const limit = data.limit || 0;
    const usage = data.usage || 0;

    const result = {
      available: limit > usage ? limit - usage : 0,
      usage: usage,
      limit: limit,
    };

    // If credits are low, provide a clear message
    if (result.available < 0.2 && result.limit > 0) {
      // Credits are low - this could be handled via a UI notification
      console.warn('API credits are running low:', result.available);
    }

    return result;
  } catch (error) {
    console.error('Error checking credits:', error);
    throw error;
  }
}
