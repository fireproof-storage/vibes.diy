/**
 * Get the database name for a session
 * @param sessionId The session ID to get the database name for
 * @returns The database name for the session
 */
export const getSessionDatabaseName = (sessionId: string) => {
  if (!sessionId) throw new Error('Session ID is required');
  return `vibe-${sessionId}`;
};
