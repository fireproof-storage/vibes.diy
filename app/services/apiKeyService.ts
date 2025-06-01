// Configure the API origin here
// TODO: Replace with your API's domain (e.g., 'https://vibecode.garden')
const API_ORIGIN = 'https://vibecode.garden'; // Leave empty for same-origin requests

/**
 * Service for managing CallAI API keys through Netlify Edge Functions
 */

/**
 * Creates a new session key through the secure Netlify Edge Function
 * @param userId Optional user ID to associate with the key
 * @returns The created key data
 */
export async function createOrUpdateKeyViaEdgeFunction(
  userId: string | undefined,
  hash?: string
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
  // Use the API_ORIGIN for cross-origin requests, or relative path for same-origin
  const endpoint = API_ORIGIN ? `${API_ORIGIN}/api/keys` : '/api/keys';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer use-vibes',
    },
    body: JSON.stringify({
      userId,
      name: userId ? `User ${userId} Session` : 'Anonymous Session',
      label: `session-${Date.now()}`,
      ...(hash !== undefined ? { hash } : {}),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create key: ${errorData.error || response.statusText}`);
  }

  return await response.json();
}
