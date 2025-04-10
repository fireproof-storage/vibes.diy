/**
 * Service for managing CallAI API keys through Netlify Edge Functions
 */

/**
 * Creates a new session key through the secure Netlify Edge Function
 * @param userId Optional user ID to associate with the key
 * @returns The created key data
 */
export async function createKeyViaEdgeFunction(userId: string | undefined): Promise<{
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
  const response = await fetch('/api/callai/create-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer temporary-auth-token',
    },
    body: JSON.stringify({
      userId,
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
