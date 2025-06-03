import { useState, useCallback } from 'react';
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
          return keyData; // Return the full stored object if valid
        }
        // If key is invalid, remove it
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
      let keyData: any = null;

      try {
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
        // Reset the pending request on error to allow future attempts
        pendingKeyRequest = null;
        // Set error state for components to display
        setError(error instanceof Error ? error : new Error('Unknown error creating API key'));
        throw error;
      } finally {
        // Always reset the pending request regardless of outcome
        pendingKeyRequest = null;
        setIsLoading(false);
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
        const error = new Error('Invalid API key response format');
        setError(error);
        throw error;
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
    try {
      const newKeyData = await fetchNewKeyInternal(userId, storedKeyData?.hash); // Pass userId and hash from localStorage if available
      // fetchNewKeyInternal already sets apiKey state and localStorage on success.
      return newKeyData;
    } catch (fetchError) {
      console.error('Error obtaining API key in ensureApiKey:', fetchError);
      throw fetchError; // Surface the error directly to the caller
    }
  }, [apiKey, userId, isLoading, checkLocalStorageForKey, fetchNewKeyInternal, error]);

  const refreshKey = useCallback(async (): Promise<{ key: string; hash: string }> => {
    // Attempt to refresh using the current key's hash if available.
    return await fetchNewKeyInternal(userId, apiKey?.hash);
  }, [fetchNewKeyInternal, userId, apiKey]);

  return { apiKey: apiKey?.key, apiKeyObject: apiKey, isLoading, error, refreshKey, ensureApiKey };
}
