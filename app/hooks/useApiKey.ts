import { useState, useEffect, useRef, useMemo } from 'react';
import { OPENROUTER_PROV_KEY } from '../config/env';
import { createSessionKey } from '../config/provisioning';
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
  // Ref to prevent double fetching in React dev mode
  const hasFetchStarted = useRef(false);

  console.log('[useApiKey] Initial state:', { apiKey, isLoading, error });

  // Store the local storage key for this user/device
  const storageKey = useMemo(() => {
    // If we have a userId, include it in the storage key
    return userId ? `vibes-openrouter-key-${userId}` : 'vibes-openrouter-key-anonymous';
  }, [userId]);

  // Check local storage for existing key first
  useEffect(() => {
    // Only run this effect if we don't already have a key and aren't loading
    if (!apiKey && !isLoading && !hasFetchStarted.current) {
      const storedKey = localStorage.getItem(storageKey);
      if (storedKey) {
        try {
          // Attempt to parse the stored key data
          const keyData = JSON.parse(storedKey);
          // Check if the key is still valid (not expired)
          const creationTime = keyData.createdAt || 0;
          const now = Date.now();
          const keyAgeInDays = (now - creationTime) / (1000 * 60 * 60 * 24);

          // If key is less than 7 days old, consider it valid
          if (keyAgeInDays < 7) {
            console.log('[useApiKey] Using stored key:', {
              hash: keyData.hash?.substring(0, 8) + '...',
              age: `${keyAgeInDays.toFixed(1)} days`,
            });
            setApiKey(keyData.key);
            return;
          } else {
            console.log('[useApiKey] Stored key expired, will create a new one');
            localStorage.removeItem(storageKey);
          }
        } catch (e) {
          console.error('[useApiKey] Error parsing stored key, will create a new one:', e);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [apiKey, isLoading, storageKey]);

  useEffect(() => {
    // Only fetch a new key if we don't already have one and we're not already loading
    // and we haven't already started fetching (prevents double fetch in React dev mode)
    console.log('[useApiKey] Checking conditions:', {
      hasApiKey: !!apiKey,
      isLoading,
      hasProvKey: !!OPENROUTER_PROV_KEY,
      hasFetchStarted: hasFetchStarted.current,
      hasUserId: !!userId,
    });

    if (!apiKey && !isLoading && OPENROUTER_PROV_KEY && !hasFetchStarted.current) {
      // Set ref to true to prevent double fetching in React dev mode
      hasFetchStarted.current = true;
      const fetchApiKey = async () => {
        console.log('[useApiKey] Starting to fetch API key');
        setIsLoading(true);
        setError(null);

        try {
          // Create a session key with a small dollar limit
          console.log('[useApiKey] Calling createSessionKey with provisioning key');

          // Prepare label based on whether we have a userId
          const keyLabel = userId
            ? `user-${userId}-${Date.now()}`
            : `anonymous-session-${Date.now()}`;

          // Try to use the Edge Function first, fall back to direct API if it fails
          let keyData;
          try {
            // Check if we're running in dev mode
            const isDev = process.env.NODE_ENV === 'development';

            if (isDev) {
              // In dev mode, use direct API call as a fallback
              console.log('[useApiKey] Dev mode detected, using direct API call');
              keyData = await createSessionKey(OPENROUTER_PROV_KEY, 0.5, {
                name: userId ? `Vibes.DIY User Session` : 'Vibes.DIY Anonymous Session',
                label: keyLabel,
              });
            } else {
              // In production, try to use the Edge Function
              console.log('[useApiKey] Using Edge Function for key creation');
              keyData = await createKeyViaEdgeFunction(userId, 0.5);
            }
          } catch (edgeError) {
            console.error(
              '[useApiKey] Edge Function failed, falling back to direct API:',
              edgeError
            );

            // Fall back to direct API call if Edge Function fails
            keyData = await createSessionKey(OPENROUTER_PROV_KEY, 0.5, {
              name: userId ? `Vibes.DIY User Session` : 'Vibes.DIY Anonymous Session',
              label: keyLabel,
            });
          }
          console.log('[useApiKey] Received key data:', {
            hash: keyData.hash,
            limit: keyData.limit,
          });

          // Store the key in localStorage with creation timestamp
          const keyToStore = {
            ...keyData,
            createdAt: Date.now(),
          };
          localStorage.setItem(storageKey, JSON.stringify(keyToStore));

          setApiKey(keyData.key);
          console.log('[useApiKey] Successfully set API key');
        } catch (err) {
          console.error('[useApiKey] Failed to create session API key:', err);
          setError(err instanceof Error ? err : new Error('Unknown error creating API key'));
          console.log(
            '[useApiKey] Set error state:',
            err instanceof Error ? err.message : 'Unknown error'
          );
        } finally {
          setIsLoading(false);
          console.log('[useApiKey] Finished API key fetch attempt, isLoading set to false');
        }
      };

      fetchApiKey();
    }
  }, []); // Empty dependency array to run only once

  const result = { apiKey, isLoading, error };
  console.log('[useApiKey] Returning state:', result);
  return result;
}
