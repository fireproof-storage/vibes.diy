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

// --- Vite Environment Variables ---
// Access environment variables safely with fallbacks

// Analytics
export const GA_TRACKING_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '';

// PostHog
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || '';

// Application Behavior
export const IS_DEV_MODE = import.meta.env.DEV || false;
export const APP_MODE = import.meta.env.MODE || 'production'; // typically 'development', 'production', 'test'

// Fireproof Connect & Auth
export const CONNECT_URL =
  import.meta.env.VITE_CONNECT_URL || 'https://dev.connect.fireproof.direct/token';
export const CONNECT_API_URL =
  import.meta.env.VITE_CONNECT_API_URL || 'https://dev.connect.fireproof.direct/api';
export const CLOUD_SESSION_TOKEN_PUBLIC_KEY = import.meta.env.VITE_CLOUD_SESSION_TOKEN_PUBLIC || '';

// Vibes Service API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vibecode.garden';

// Chat History Database
export const FIREPROOF_CHAT_HISTORY =
  (import.meta.env.VITE_VIBES_CHAT_HISTORY || 'vibes-chats') + getVersionSuffix();
