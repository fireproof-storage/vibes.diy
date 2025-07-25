/**
 * Simplified hook for API key management
 * Returns a dummy key that the backend proxy can identify and handle
 */
export function useApiKey() {
  // Use a special dummy key that backend can recognize
  const PROXY_DUMMY_KEY = 'sk-vibes-proxy-managed';

  return {
    apiKey: PROXY_DUMMY_KEY,
    apiKeyObject: { key: PROXY_DUMMY_KEY, hash: 'proxy' },
    error: null,
    refreshKey: async () => ({ key: PROXY_DUMMY_KEY, hash: 'proxy' }),
    ensureApiKey: async () => ({ key: PROXY_DUMMY_KEY, hash: 'proxy' }),
    saveApiKey: () => {},
    clearApiKey: () => {},
  };
}
