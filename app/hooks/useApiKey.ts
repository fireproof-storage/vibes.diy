import { useState, useCallback } from 'react';
import { CALLAI_API_KEY } from '../config/env';
import { createOrUpdateKeyViaEdgeFunction } from '../services/apiKeyService';

// Global request tracking to prevent duplicate API calls
let pendingKeyRequest: Promise<any> | null = null;

/**
 * Hook for API key management that uses dynamic key provisioning
 * @param userId - Optional user ID for associating keys with specific users
 * @returns Object containing apiKey, isLoading, and error states
 */
export function useApiKey(userId?: string) {
  const [apiKey, setApiKey] = useState<{ key: string; hash: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  // Always use a consistent storage key regardless of user ID
  const storageKey = 'vibes-openrouter-key';

  const checkLocalStorageForKey = useCallback(() => {
    const storedKey = localStorage.getItem(storageKey);
    if (storedKey) {
      try {
        const keyData = JSON.parse(storedKey);
        // Make sure we have a valid key object
        if (keyData.key && typeof keyData.key === 'string' && keyData.hash) {
          // Ensure hash is checked
          const creationTime = keyData.createdAt || 0;
          const now = Date.now();
          const keyAgeInDays = (now - creationTime) / (1000 * 60 * 60 * 24);

          if (keyAgeInDays < 7) {
            // Keep 7-day expiry from current code
            return keyData; // Return the full stored object
          }
        }
        // If key is invalid or expired, remove it
        localStorage.removeItem(storageKey);
      } catch (e) {
        localStorage.removeItem(storageKey); // Corrupted data
      }
    }
    return null;
  }, [storageKey]);

  // Internal function to fetch a new key
  const fetchNewKeyInternal = useCallback(
    async (currentUserId?: string, currentKeyHash?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        let keyData;
        if (CALLAI_API_KEY === 'force-prov') {
          keyData = {
            key: CALLAI_API_KEY,
            hash: 'local-dev',
            name: 'Local Development Key',
            label: 'local-dev',
            limit: 1.0,
            disabled: false,
            usage: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        } else {
          try {
            // Check for rate limiting - only if we don't already have a key
            // being passed (e.g. from our successful response)
            if (!keyData) {
              const lastAttempt = localStorage.getItem('vibes-key-backoff');
              if (lastAttempt) {
                const lastTime = parseInt(lastAttempt, 10);
                const now = Date.now();
                const elapsedMs = now - lastTime;

                // If last attempt was less than 10 seconds ago, wait before trying again
                if (elapsedMs < 10 * 1000) {
                  const waitTime = Math.ceil((10 * 1000 - elapsedMs) / 1000);
                  const tempErr = new Error(
                    `Rate limited. Please try again in ${waitTime} seconds.`
                  );
                  setError(tempErr);
                  setIsLoading(false);
                  return;
                }
              }
            }

            // Clear any old state that might be causing confusion
            localStorage.removeItem('vibes-key-backoff');

            // Set the attempt timestamp before making the request
            localStorage.setItem('vibes-key-backoff', Date.now().toString());

            // Deduplicate API key requests across components
            if (!pendingKeyRequest) {
              // Extract hash from localStorage even if the key is expired
              let storedHash = apiKey?.hash;
              if (!storedHash) {
                const storedData = localStorage.getItem(storageKey);
                if (storedData) {
                  try {
                    const parsed = JSON.parse(storedData);
                    storedHash = parsed.hash;
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }
              }

              pendingKeyRequest = createOrUpdateKeyViaEdgeFunction(
                currentUserId,
                currentKeyHash || storedHash
              );
            }

            // Wait for the existing or new request to complete
            const apiResponse = await pendingKeyRequest;

            // Success - clear the backoff timer
            localStorage.removeItem('vibes-key-backoff');

            // Reset the pending request after successful fetch
            pendingKeyRequest = null;

            // Ensure we have the correct key structure
            if (apiResponse && typeof apiResponse === 'object') {
              // Check if the API returned a nested key object (common with some APIs)
              if (
                'key' in apiResponse &&
                typeof apiResponse.key === 'object' &&
                apiResponse.key &&
                'key' in apiResponse.key
              ) {
                keyData = apiResponse.key; // Type should be handled by createOrUpdateKeyViaEdgeFunction's return type
              } else {
                keyData = apiResponse; // Type should be handled by createOrUpdateKeyViaEdgeFunction's return type
              }
            }
          } catch (error) {
            // Reset the pending request on error to allow retries
            pendingKeyRequest = null;

            // Handle rate limiting specifically
            if (error instanceof Error && error.message.includes('Too Many Requests')) {
              // Don't remove the backoff timer on rate limit errors
            } else {
              // For other errors, clear the backoff timer
              localStorage.removeItem('vibes-key-backoff');
            }
            throw error;
          }
        }

        // Validate that we have a proper key object before storing
        if (keyData && typeof keyData.key === 'string' && keyData.key.trim() !== '') {
          const keyToStore = {
            ...keyData,
            createdAt: Date.now(),
          };

          localStorage.setItem(storageKey, JSON.stringify(keyToStore));
          const resultingKey = { key: keyData.key, hash: keyData.hash };
          setApiKey(resultingKey);
          return resultingKey; // Return the key/hash object for ensureApiKey
        } else {
          throw new Error('Invalid API key response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error creating API key'));
        // Clear any invalid data that might be in localStorage
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (!parsed.key || parsed.error) {
              localStorage.removeItem(storageKey);
            }
          } catch (e) {
            // If we can't parse it, it's invalid
            localStorage.removeItem(storageKey);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [userId, storageKey]
  ); // Retain original dependencies for fetchNewKeyInternal's closure

  const ensureApiKey = useCallback(async (): Promise<{ key: string; hash: string }> => {
    // 1. If we already have a valid key in state and not currently loading, use it.
    if (apiKey?.key && apiKey?.hash && !isLoading) {
      return apiKey;
    }

    // 2. Check localStorage for an existing valid key.
    const storedKeyData = checkLocalStorageForKey();
    if (storedKeyData?.key && storedKeyData?.hash) {
      setApiKey({ key: storedKeyData.key, hash: storedKeyData.hash });
      return { key: storedKeyData.key, hash: storedKeyData.hash };
    }

    // 3. No valid key in state or localStorage, so fetch a new one.
    // setIsLoading(true); // fetchNewKeyInternal will set this
    // setError(null);
    try {
      const newKeyData = await fetchNewKeyInternal(userId, storedKeyData?.hash); // Pass userId and hash from localStorage if available
      if (!newKeyData?.key || !newKeyData?.hash) {
        // fetchNewKeyInternal now expected to return key/hash or throw
        // This path should ideally not be hit if fetchNewKeyInternal throws on failure or returns valid data.
        // However, as a safeguard based on original plan's fallback:
        if (storedKeyData?.key) {
          // Fallback to localStorage key if fetch failed but a key string exists
          console.warn('Using potentially stale localStorage key as fallback after fetch failure.');
          setApiKey({
            key: storedKeyData.key,
            hash: storedKeyData.hash || 'unknown_fallback_hash',
          });
          return { key: storedKeyData.key, hash: storedKeyData.hash || 'unknown_fallback_hash' };
        }
        throw error || new Error('Failed to obtain a new API key and no fallback available.');
      }
      // fetchNewKeyInternal already sets apiKey state and localStorage on success.
      return newKeyData;
    } catch (fetchError) {
      console.error('Error obtaining API key in ensureApiKey:', fetchError);
      // As a desperate fallback, if the localStorage key has a key string, try to use it anyway
      if (storedKeyData?.key) {
        console.warn('Using localStorage key as fallback despite fetch error in ensureApiKey.');
        setApiKey({ key: storedKeyData.key, hash: storedKeyData.hash || 'unknown_fallback_hash' });
        return { key: storedKeyData.key, hash: storedKeyData.hash || 'unknown_fallback_hash' };
      }
      throw fetchError; // Re-throw the error if no key could be provided.
    }
  }, [apiKey, userId, isLoading, checkLocalStorageForKey, fetchNewKeyInternal, error]);

  const refreshKey = useCallback(async () => {
    // setIsLoading(true); // fetchNewKeyInternal will set this
    // setError(null);
    // Attempt to refresh using the current key's hash if available.
    return await fetchNewKeyInternal(userId, apiKey?.hash);
  }, [fetchNewKeyInternal, userId, apiKey]);

  return { apiKey: apiKey?.key, apiKeyObject: apiKey, isLoading, error, refreshKey, ensureApiKey };
}
