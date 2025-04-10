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

    const data = await response.json();

    // Map the response to the expected format
    return {
      available: data.limit_remaining || 0,
      usage: data.limit - data.limit_remaining || 0,
      limit: data.limit || 0,
    };
  } catch (error) {
    console.error('Error fetching key credits:', error);
    throw error;
  }
}
