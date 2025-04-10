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

  // Combined effect to check localStorage and fetch new key if needed
  useEffect(() => {
    const checkAndLoadKey = async () => {
      // Only proceed if we don't have a key and haven't started fetching
      if (apiKey || isLoading || hasFetchStarted.current) {
        return;
      }
      
      hasFetchStarted.current = true;
      console.log('💾 Checking localStorage for API key at:', storageKey);
      
      const storedKey = localStorage.getItem(storageKey);
      if (storedKey) {
        try {
          const keyData = JSON.parse(storedKey);
          const creationTime = keyData.createdAt || 0;
          const now = Date.now();
          const keyAgeInDays = (now - creationTime) / (1000 * 60 * 60 * 24);

          if (keyAgeInDays < 7) {
            console.log('✅ Using valid key from localStorage, age:', keyAgeInDays.toFixed(2), 'days');
            setApiKey(keyData.key);
            return; // Exit early since we found a valid key
          } else {
            console.log('⏰ Key expired, age:', keyAgeInDays.toFixed(2), 'days, removing from storage');
            localStorage.removeItem(storageKey);
          }
        } catch (e) {
          console.error('❌ Error parsing stored key, removing:', e);
          localStorage.removeItem(storageKey);
        }
      } else {
        console.log('🔍 No API key found in localStorage');
      }
      
      // If we reach here, we need to fetch a new key
      await fetchNewKey();
    };
    
    checkAndLoadKey();
  }, [storageKey]); // Only re-run if storageKey changes (e.g., if userId changes)

  // Function to fetch a new key - moved outside useEffect for reuse
  const fetchNewKey = async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('ENV CHECK:', { 
      CALLAI_API_KEY: !!CALLAI_API_KEY,
      viteEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('OPENROUTER') || key.includes('CALLAI'))
    });

    try {
      let keyData;
      
      // Log which path we're taking: direct key or provisioning API
      if (CALLAI_API_KEY) {
        console.log('🔑 Using DIRECT CALLAI DEV KEY from environment variable');
        console.log('💡 To test provisioning API, remove VITE_CALLAI_API_KEY from .env');
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
        console.log('🔄 Using PROVISIONING API via edge function');
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
      console.log('💾 Saving new API key to localStorage:', {
        hash: keyData.hash,
        limit: keyData.limit,
        label: keyData.label,
        storage_key: storageKey
      });
      localStorage.setItem(storageKey, JSON.stringify(keyToStore));

      setApiKey(keyData.key);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error creating API key'));
    } finally {
      setIsLoading(false);
    }
  };

  return { apiKey, isLoading, error };
}
