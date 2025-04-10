/**
 * OpenRouter API key provisioning utilities
 * Allows programmatic creation of API keys with specific credit limits
 */

/**
 * Creates a new OpenRouter API key with a specified dollar amount limit
 * @param provisioningKey - The OpenRouter provisioning API key
 * @param dollarAmount - The dollar amount to set as the credit limit
 * @param options - Optional parameters for key creation
 * @returns The newly created API key information
 */
export async function createSessionKey(
  provisioningKey: string,
  dollarAmount: number,
  options?: {
    name?: string;
    label?: string;
  }
): Promise<{
  key: string;
  hash: string;
  name: string;
  label: string;
  limit: number;
  disabled: boolean;
  usage: number;
  created_at: string;
  updated_at: string;
}> {
  const BASE_URL = 'https://openrouter.ai/api/v1/keys';

  // Convert dollar amount to credit limit (assuming 1 dollar = 1 credit)
  const creditLimit = dollarAmount;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provisioningKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options?.name || 'Session Key',
        label: options?.label || `session-${Date.now()}`,
        limit: creditLimit,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create session key: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error creating OpenRouter session key:', error);
    throw error;
  }
}

/**
 * Retrieves information about a specific API key
 * @param provisioningKey - The OpenRouter provisioning API key
 * @param keyHash - The hash of the key to retrieve
 */
export async function getKeyInfo(provisioningKey: string, keyHash: string) {
  const BASE_URL = 'https://openrouter.ai/api/v1/keys';

  try {
    const response = await fetch(`${BASE_URL}/${keyHash}`, {
      headers: {
        Authorization: `Bearer ${provisioningKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get key info: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error retrieving OpenRouter key info:', error);
    throw error;
  }
}

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
    const response = await fetch('https://openrouter.ai/api/v1/credits', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch credits: ${response.status}`);
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching OpenRouter credits:', error);
    throw error;
  }
}
