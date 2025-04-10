/**
 * Service for managing OpenRouter API keys through Netlify Edge Functions
 */

/**
 * Creates a new OpenRouter session key through the secure Netlify Edge Function
 * @param userId Optional user ID to associate with the key
 * @param dollarAmount Dollar amount limit for the key
 * @returns The created key data
 */
export async function createKeyViaEdgeFunction(
  userId: string | undefined,
  dollarAmount: number = 0.5
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
  const response = await fetch('/api/openrouter/create-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In the future, this will be a real auth token
      Authorization: 'Bearer temporary-auth-token',
    },
    body: JSON.stringify({
      userId,
      dollarAmount,
      name: userId ? `User ${userId} Session` : 'Anonymous Session',
      label: `session-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create key: ${errorData.error || response.statusText}`);
  }

  return await response.json();
}

/**
 * Checks credits for a specific key through the secure Netlify Edge Function
 * @param keyHash Hash of the key to check
 * @returns Credit information for the key
 */
export async function checkCreditsViaEdgeFunction(keyHash: string): Promise<{
  available: number;
  usage: number;
  limit: number;
}> {
  const response = await fetch('/api/openrouter/check-credits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In the future, this will be a real auth token
      Authorization: 'Bearer temporary-auth-token',
    },
    body: JSON.stringify({ keyHash }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to check credits: ${errorData.error || response.statusText}`);
  }

  const data = await response.json();

  return {
    available: data.limit - data.usage,
    usage: data.usage,
    limit: data.limit,
  };
}
