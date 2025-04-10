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
    // Use the auth/key endpoint to get information about the key itself
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch key credits: ${response.status}`);
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
    }

    return result;
  } catch (error) {
    throw error;
  }
}
