import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ApiKeyResponse } from '../services/apiKeyService';
import { createOrUpdateKeyViaEdgeFunction } from '../services/apiKeyService';

/**
 * Hook for API key management that uses dynamic key provisioning
 * @param userId - Optional user ID for associating keys with specific users
 * @returns Object containing apiKey, error, refreshKey, and ensureApiKey states
 */
export function useApiKey() {
  const [apiKey, setApiKey] = useState<{ key: string; hash: string } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const loadingPromiseRef = useRef<Promise<{ key: string; hash: string }> | null>(null);
  const { token, userPayload } = useAuth(); // Get auth token and payload
  const userId = userPayload?.userId;

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
    async (currentKeyHashParam?: string): Promise<{ key: string; hash: string }> => {
      // Determine which hash (if any) to send to the server
      let hashToUse = currentKeyHashParam ?? apiKey?.hash;

      if (!hashToUse) {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            hashToUse = parsed.hash;
          } catch {
            /* ignore JSON parse errors */
          }
        }
      }

      if (!token || !userId) {
        throw new Error('User not authenticated');
      }

      const apiResponse: ApiKeyResponse = await createOrUpdateKeyViaEdgeFunction(
        userId,
        hashToUse,
        token
      );

      if (!apiResponse.success) {
        const err = new Error(apiResponse.error || 'Failed to obtain API key');
        localStorage.removeItem(storageKey);
        setApiKey(null);
        setError(err);
        throw err;
      }

      const keyData = apiResponse.key;

      let resultingKey: { key: string; hash: string };

      if (keyData.key) {
        // New key string provided – store entire payload
        const keyToStore = { ...keyData, createdAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(keyToStore));
        resultingKey = { key: keyData.key, hash: keyData.hash };
      } else {
        // Key string omitted – treat as silent renewal/extension
        // Preserve existing key string (from state or storage)
        const existingKeyString =
          apiKey?.key ??
          (() => {
            try {
              const stored = localStorage.getItem(storageKey);
              if (stored) return JSON.parse(stored).key as string;
            } catch {}
            return '';
          })();

        resultingKey = { key: existingKeyString, hash: keyData.hash };
      }

      setApiKey(resultingKey);
      return resultingKey;
    },
    [userId, apiKey, storageKey, setApiKey, setError, token]
  );

  const ensureApiKey = useCallback(async (): Promise<{ key: string; hash: string }> => {
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current;
    }

    if (apiKey?.key && apiKey?.hash) {
      return apiKey;
    }

    const storedKeyData = checkLocalStorageForKey();
    if (storedKeyData?.key && storedKeyData?.hash) {
      setApiKey({ key: storedKeyData.key, hash: storedKeyData.hash });
      return { key: storedKeyData.key, hash: storedKeyData.hash };
    }

    const fetchPromise = fetchNewKeyInternal(storedKeyData?.hash)
      .then((newKey) => {
        loadingPromiseRef.current = null;
        return newKey;
      })
      .catch((err) => {
        loadingPromiseRef.current = null;
        // error state is already set by fetchNewKeyInternal
        throw err;
      });

    loadingPromiseRef.current = fetchPromise;
    return fetchPromise;
  }, [apiKey, checkLocalStorageForKey, fetchNewKeyInternal]);

  const refreshKey = useCallback(async (): Promise<{ key: string; hash: string }> => {
    // Attempt to refresh using the current key's hash if available.
    return await fetchNewKeyInternal(apiKey?.hash);
  }, [fetchNewKeyInternal, apiKey]);

  return { apiKey: apiKey?.key, apiKeyObject: apiKey, error, refreshKey, ensureApiKey };
}
