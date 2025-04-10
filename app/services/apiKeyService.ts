/**
 * Service for managing CallAI API keys through Netlify Edge Functions
 */

/**
 * Creates a new session key through the secure Netlify Edge Function
 * @param userId Optional user ID to associate with the key
 * @param dollarAmount Dollar amount limit for the key
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
  console.log(
    '🔄 Creating new API key via edge function for',
    userId ? `user ${userId}` : 'anonymous user'
  );
  const requestStart = Date.now();
  const response = await fetch('/api/callai/create-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In the future, this will be a real auth token
      Authorization: 'Bearer temporary-auth-token',
    },
    body: JSON.stringify({
      userId,
      name: userId ? `User ${userId} Session` : 'Anonymous Session',
      label: `session-${Date.now()}`,
    }),
  });

  const responseTime = Date.now() - requestStart;
  console.log(`⏱️ Edge function responded in ${responseTime}ms with status ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ Edge function error:', errorData);
    throw new Error(`Failed to create key: ${errorData.error || response.statusText}`);
  }

  const responseData = await response.json();
  console.log('✅ New key received:', {
    hash: responseData.hash,
    limit: responseData.limit,
    label: responseData.label,
  });

  return responseData;
}
