/**
 * Central configuration file for environment variables
 * Provides fallback values for required environment variables
 */

// Fireproof database name
export const FIREPROOF_CHAT_HISTORY =
  import.meta.env.VITE_FIREPROOF_CHAT_HISTORY || 'fireproof-chat-history';

// Other environment variables can be added here as needed
export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
