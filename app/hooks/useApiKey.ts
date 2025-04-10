import { useState, useEffect, useRef, useCallback } from 'react';
import { CALLAI_API_KEY } from '../config/env';
import { createKeyViaEdgeFunction } from '../services/apiKeyService';

/**
 * Hook for API key management that uses dynamic key provisioning
 * @param userId - Optional user ID for associating keys with specific users
 * @returns Object containing apiKey, isLoading, and error states
 */
export function useApiKey(userId?: string) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchStarted = useRef(false);

  // Always use a consistent storage key regardless of user ID
  const storageKey = 'vibes-openrouter-key';

  // Combined effect to check localStorage and fetch new key if needed
  useEffect(() => {
    const checkAndLoadKey = async () => {
      // Only proceed if we don't have a key and haven't started fetching
      if (apiKey || isLoading || hasFetchStarted.current) {
        return;
      }

      hasFetchStarted.current = true;

      const storedKey = localStorage.getItem(storageKey);
      if (storedKey) {
        try {
          const keyData = JSON.parse(storedKey);
          const creationTime = keyData.createdAt || 0;
          const now = Date.now();
          const keyAgeInDays = (now - creationTime) / (1000 * 60 * 60 * 24);

          if (keyAgeInDays < 7) {
            setApiKey(keyData.key);
            return; // Exit early since we found a valid key
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch (e) {
          localStorage.removeItem(storageKey);
        }
      } else {
      }

      // If we reach here, we need to fetch a new key
      await fetchNewKey();
    };

    checkAndLoadKey();
  }, [storageKey]); // Only re-run if storageKey changes (e.g., if userId changes)

  // Function to fetch a new key - moved outside useEffect for reuse
  const fetchNewKey = useCallback(async () => {
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
          keyData = await createKeyViaEdgeFunction(userId);
        } catch (error) {
          throw error;
        }
      }

      const keyToStore = {
        ...keyData,
        createdAt: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(keyToStore));

      setApiKey(keyData.key);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error creating API key'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, storageKey]);

  const refreshKey = useCallback(async () => {
    // todo test for userId
    return await fetchNewKey();
  }, [fetchNewKey]);

  return { apiKey, isLoading, error, refreshKey };
}
