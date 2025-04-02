import { fireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';

// Cache of database instances to avoid recreating them
const databaseCache = new Map<string, ReturnType<typeof fireproof>>();

/**
 * Get the main sessions database that stores session metadata
 * @returns Main Fireproof database instance
 */
export const getSessionsDatabase = () => {
  if (!databaseCache.has(FIREPROOF_CHAT_HISTORY)) {
    databaseCache.set(FIREPROOF_CHAT_HISTORY, fireproof(FIREPROOF_CHAT_HISTORY));
  }
  return databaseCache.get(FIREPROOF_CHAT_HISTORY)!;
};

/**
 * Get a session-specific database
 * @param sessionId The session ID to get the database for
 * @returns Session-specific Fireproof database instance
 */
export const getSessionDatabase = (sessionId: string) => {
  if (!sessionId) throw new Error('Session ID is required');

  const dbName = `vibe-${sessionId}`;

  if (!databaseCache.has(dbName)) {
    databaseCache.set(dbName, fireproof(dbName));
  }

  return databaseCache.get(dbName)!;
};

/**
 * Get the database name for a session
 * @param sessionId The session ID to get the database name for
 * @returns The database name for the session
 */
export const getSessionDatabaseName = (sessionId: string) => {
  if (!sessionId) throw new Error('Session ID is required');
  return `vibe-${sessionId}`;
};
