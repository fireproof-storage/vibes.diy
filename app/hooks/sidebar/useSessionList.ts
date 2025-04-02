import { useEffect, useState } from 'react';
import { useFireproof, fireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../../config/env';
import type { SessionDocument, ScreenshotDocument } from '../../types/chat';
import { getSessionDatabaseName } from '../../utils/databaseManager';

/**
 * Type to represent either a session document or a screenshot document
 */
type SessionOrScreenshot = {
  _id: string;
  type?: 'session' | 'screenshot';
  session_id?: string;
  title?: string;
  created_at?: number;
  _files?: Record<string, any>;
};

/**
 * Type for grouped session data including its associated screenshots
 */
export type GroupedSession = {
  session: SessionDocument;
  screenshots: SessionOrScreenshot[];
};

/**
 * Custom hook for retrieving all sessions with their associated screenshots
 * Now uses a sharded database approach: session metadata in main database,
 * screenshots and other content in session-specific databases
 * @returns An object containing the grouped sessions and loading state
 */
export function useSessionList(justFavorites = false) {
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const [groupedSessions, setGroupedSessions] = useState<GroupedSession[]>([]);

  // Query only session metadata from the main database
  const { docs: sessionDocs } = useLiveQuery<SessionDocument>('type', {
    key: 'session',
  });

  // Fetch screenshots for each session from their respective databases
  useEffect(() => {
    if (!sessionDocs || sessionDocs.length === 0) {
      setGroupedSessions([]);
      return;
    }

    // Filter sessions by favorites if requested
    const filteredSessions = justFavorites
      ? sessionDocs.filter((session) => session.favorite)
      : sessionDocs;

    // Process all sessions and fetch their screenshots
    const fetchSessionScreenshots = async () => {
      const sessionsWithScreenshots = await Promise.all(
        filteredSessions.map(async (session) => {
          if (!session._id) {
            throw new Error('Session without ID encountered');
          }

          // Get the session-specific database
          const sessionDb = fireproof(getSessionDatabaseName(session._id));

          // Query screenshots from the session database
          const result = await sessionDb.query('type', {
            key: 'screenshot',
            includeDocs: true,
          });

          const screenshots = (result.rows || [])
            .map((row) => row.doc)
            .filter(Boolean) as ScreenshotDocument[];

          return {
            session,
            screenshots,
          };
        })
      );

      // Sort by creation date (newest first)
      const sortedSessions = sessionsWithScreenshots.sort((a, b) => {
        const timeA = a.session.created_at || 0;
        const timeB = b.session.created_at || 0;
        return timeB - timeA;
      });

      setGroupedSessions(sortedSessions);
    };

    fetchSessionScreenshots();
  }, [sessionDocs, justFavorites]);

  return {
    database,
    groupedSessions,
  };
}
