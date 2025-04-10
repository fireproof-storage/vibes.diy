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
            return;
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
    }
  }, [apiKey, isLoading, storageKey]);

  useEffect(() => {
    // Simple environment check that only runs once
    if (!hasFetchStarted.current) {
      console.log('ENV CHECK:', { 
        CALLAI_API_KEY: !!CALLAI_API_KEY,
        viteEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('OPENROUTER') || key.includes('CALLAI'))
      });
    }
    
    // If we have no API key and we're not already loading or fetching, get a key
    // This should work whether or not CALLAI_API_KEY is set
    if (!apiKey && !isLoading && !hasFetchStarted.current) {
      hasFetchStarted.current = true;
      const fetchApiKey = async () => {
        setIsLoading(true);
        setError(null);

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

      fetchApiKey();
    }
  }, []);

  return { apiKey, isLoading, error };
}
