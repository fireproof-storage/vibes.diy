import { fireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';

/**
 * Get the main sessions database that stores session metadata
 * @returns Main Fireproof database instance
 */
export const getSessionsDatabase = () => {
  return fireproof(FIREPROOF_CHAT_HISTORY);
};

/**
 * Get a session-specific database
 * @param sessionId The session ID to get the database for
 * @returns Session-specific Fireproof database instance
 */
export const getSessionDatabase = (sessionId: string) => {
  if (!sessionId) throw new Error('Session ID is required');
  const dbName = getSessionDatabaseName(sessionId);
  return fireproof(dbName);
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
