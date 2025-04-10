/**
 * Central configuration file for environment variables
 * Provides fallback values for required environment variables
 */

// Function to get the current database version from local storage
const getDatabaseVersion = (): number => {
  if (typeof window === 'undefined') return 0;

  const storedVersion = localStorage.getItem('vibes-db-version') || '';
  return storedVersion ? JSON.parse(storedVersion) : 0;
};

// Function to increment the database version
export const incrementDatabaseVersion = (): number => {
  if (typeof window === 'undefined') return 0;

  const currentVersion = getDatabaseVersion();
  const newVersion = currentVersion === 0 ? 1 : currentVersion + 1;

  localStorage.setItem('vibes-db-version', JSON.stringify(newVersion));
  return newVersion;
};

// Fireproof database name with version suffix
const getVersionSuffix = (): string => {
  const version = getDatabaseVersion();
  return version === 0 ? '' : `${version}`;
};

// Fireproof database name
export const FIREPROOF_CHAT_HISTORY =
  (import.meta.env.VITE_VIBES_CHAT_HISTORY || 'vibes-chats') + getVersionSuffix();

// Other environment variables can be added here as needed
// Using CALLAI_API_KEY as the primary API key for all AI services
export const CALLAI_API_KEY =
  import.meta.env.VITE_CALLAI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;
