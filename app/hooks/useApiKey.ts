import { useState, useEffect, useRef, useMemo } from 'react';
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

  const storageKey = useMemo(() => {
    return userId ? `vibes-openrouter-key-${userId}` : 'vibes-openrouter-key-anonymous';
  }, [userId]);

  useEffect(() => {
    if (!apiKey && !isLoading && !hasFetchStarted.current) {
      const storedKey = localStorage.getItem(storageKey);
      if (storedKey) {
        try {
          const keyData = JSON.parse(storedKey);
          const creationTime = keyData.createdAt || 0;
          const now = Date.now();
          const keyAgeInDays = (now - creationTime) / (1000 * 60 * 60 * 24);

          if (keyAgeInDays < 7) {
            setApiKey(keyData.key);
            return;
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch (e) {
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [apiKey, isLoading, storageKey]);

  useEffect(() => {
    if (!apiKey && !isLoading && CALLAI_API_KEY && !hasFetchStarted.current) {
      hasFetchStarted.current = true;
      const fetchApiKey = async () => {
        setIsLoading(true);
        setError(null);

        try {
          let keyData;

          if (CALLAI_API_KEY) {
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
      };

      fetchApiKey();
    }
  }, []);

  return { apiKey, isLoading, error };
}
