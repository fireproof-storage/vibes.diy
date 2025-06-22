import { API_BASE_URL } from '../config/env';

// API_ORIGIN is now API_BASE_URL from env.ts

/**
 * Service for managing CallAI API keys through Netlify Edge Functions
 */

export type ApiKeyResponse = {
  success: boolean;
  error?: string;
  key: {
    key?: string;
    hash: string;
    name: string;
    label: string;
    limit: number;
    disabled: boolean;
    usage: number;
    created_at: string;
    updated_at: string;
  };
};

/**
 * Creates a new session key through the secure Netlify Edge Function
 * @param userId Optional user ID to associate with the key
 * @returns The created key data
 */
export async function createOrUpdateKeyViaEdgeFunction(
  userId: string,
  hash: string | undefined,
  token: string
): Promise<ApiKeyResponse> {
  // Use the API_ORIGIN for cross-origin requests, or relative path for same-origin
  const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/keys` : '/api/keys';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  headers.Authorization = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
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
