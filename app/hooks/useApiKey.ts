import { useState, useEffect } from 'react';
import { OPENROUTER_PROV_KEY } from '../config/env';
import { createSessionKey } from '../config/provisioning';

/**
 * Hook for API key management that uses dynamic key provisioning
 * @returns Object containing apiKey, isLoading, and error states
 */
export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only fetch a new key if we don't already have one and we're not already loading
    if (!apiKey && !isLoading && OPENROUTER_PROV_KEY) {
      const fetchApiKey = async () => {
        setIsLoading(true);
        setError(null);

        try {
          // Create a session key with a small dollar limit
          const keyData = await createSessionKey(OPENROUTER_PROV_KEY, 0.01, {
            name: 'Vibes.DIY Session',
            label: `vibes-session-${Date.now()}`,
          });

          setApiKey(keyData.key);
        } catch (err) {
          console.error('Failed to create session API key:', err);
          setError(err instanceof Error ? err : new Error('Unknown error creating API key'));
        } finally {
          setIsLoading(false);
        }
      };

      fetchApiKey();
    }
  }, [apiKey, isLoading]);

  return { apiKey, isLoading, error };
}
