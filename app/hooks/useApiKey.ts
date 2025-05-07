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
    let isMounted = true; // Track component mount state
    hasFetchStarted.current = false; // Reset on dependency changes
    
    const checkAndLoadKey = async () => {
      // Only proceed if we don't have a key and haven't started fetching
      if (apiKey || isLoading || hasFetchStarted.current) {
        return;
      }

      hasFetchStarted.current = true;

      // Clear any stale backoff timer on load
      localStorage.removeItem('vibes-key-backoff');
      
      const storedKey = localStorage.getItem(storageKey);
      if (storedKey) {
        try {
          const keyData = JSON.parse(storedKey);
          
          // Make sure we have a valid key object
          if (keyData.key && typeof keyData.key === 'string') {
            const creationTime = keyData.createdAt || 0;
            const now = Date.now();
            const keyAgeInDays = (now - creationTime) / (1000 * 60 * 60 * 24);

            if (keyAgeInDays < 7) {
              if (isMounted) {
                console.log('Using existing API key from localStorage');
                setApiKey(keyData.key);
              }
              return; // Exit early since we found a valid key
            }
          }
          
          // If we got here, the key is invalid or expired
          console.log('Removing invalid or expired key');
          localStorage.removeItem(storageKey);
        } catch (e) {
          console.log('Error parsing stored key, removing it');
          localStorage.removeItem(storageKey);
        }
      }

      if (!isMounted) return;
      
      // If we reach here, we need to fetch a new key
      await fetchNewKey();
    };

    checkAndLoadKey();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [storageKey, userId]); // Re-run if storageKey or userId changes

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
                console.log(`Rate limited, waiting ${waitTime} seconds before trying again`);
              
                const tempErr = new Error(`Rate limited. Please try again in ${waitTime} seconds.`);
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
          
          // Make the actual API call
          console.log('Creating new API key for userId:', userId || 'anonymous');
          const apiResponse = await createKeyViaEdgeFunction(userId);
          
          // If we got here, we succeeded - clear the backoff timer
          console.log('Successfully created new API key!');
          localStorage.removeItem('vibes-key-backoff');
          
          // Ensure we have the correct key structure
          if (apiResponse && typeof apiResponse === 'object') {
            // Check if the API returned a nested key object (common with some APIs)
            if ('key' in apiResponse && typeof apiResponse.key === 'object' && apiResponse.key && 'key' in apiResponse.key) {
              keyData = apiResponse.key as any; // Cast to any to overcome type issues
              console.log('Using nested key object from response');
            } else {
              keyData = apiResponse as any; // Cast to any to overcome type issues
              console.log('Using direct key object from response');
            }
          }
        } catch (error) {
          // Handle rate limiting specifically
          if (error instanceof Error && error.message.includes('Too Many Requests')) {
            console.warn('Rate limited when creating API key');
            // Don't remove the backoff timer on rate limit errors
          } else {
            // For other errors, clear the backoff timer
            localStorage.removeItem('vibes-key-backoff');
            console.error('Error creating API key:', error);
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
        setApiKey(keyData.key);
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
            console.log('Clearing invalid key data from localStorage');
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
  }, [userId, storageKey]);

  const refreshKey = useCallback(async () => {
    // todo test for userId
    return await fetchNewKey();
  }, [fetchNewKey]);

  return { apiKey, isLoading, error, refreshKey };
}
