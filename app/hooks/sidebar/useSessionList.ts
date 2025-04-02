import { useEffect, useState } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../../config/env';
import type { SessionDocument, ScreenshotDocument } from '../../types/chat';
import { getSessionsDatabase, getSessionDatabase } from '../../utils/databaseManager';

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
  const mainDatabase = getSessionsDatabase();
  const { useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const [groupedSessions, setGroupedSessions] = useState<GroupedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Query only session metadata from the main database
  const { docs: sessionDocs } = useLiveQuery<SessionDocument>('type', {
    key: 'session',
    includeDocs: true,
  });

  // Fetch screenshots for each session from their respective databases
  useEffect(() => {
    if (!sessionDocs || sessionDocs.length === 0) {
      setGroupedSessions([]);
      setIsLoading(false);
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
          try {
            if (!session._id) {
              console.error('Session without ID encountered');
              return { session, screenshots: [] };
            }

            // Get the session-specific database
            const sessionDb = getSessionDatabase(session._id);

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
          } catch (error) {
            console.error(`Error fetching screenshots for session ${session._id}:`, error);
            return {
              session,
              screenshots: [],
            };
          }
        })
      );

      // Sort by creation date (newest first)
      const sortedSessions = sessionsWithScreenshots.sort((a, b) => {
        const timeA = a.session.created_at || 0;
        const timeB = b.session.created_at || 0;
        return timeB - timeA;
      });

      setGroupedSessions(sortedSessions);
      setIsLoading(false);
    };

    fetchSessionScreenshots();
  }, [sessionDocs, justFavorites]);

  return {
    database: mainDatabase,
    groupedSessions,
    count: groupedSessions.length,
    isLoading,
  };
}
