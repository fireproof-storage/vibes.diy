import { useEffect, useState, useCallback, useMemo } from 'react';
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
  const { database, useAllDocs } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const [allSessionsWithScreenshots, setAllSessionsWithScreenshots] = useState<GroupedSession[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Query only session metadata from the main database
  const { docs: allDocs } = useAllDocs<SessionDocument>();
  // Track loading state ourselves since it's not provided by useAllDocs
  const isDocsLoading = allDocs.length === 0;

  // Memoize the filtered session documents to avoid recomputation on every render
  const sessionDocs = useMemo(() => allDocs.filter((doc) => doc.type === 'session'), [allDocs]);

  // Process all sessions and fetch their screenshots
  // Wrapped in useCallback to avoid recreating this function on every render
  const fetchSessionScreenshots = useCallback(
    async (sessions: SessionDocument[]): Promise<GroupedSession[]> => {
      if (!sessions || sessions.length === 0) {
        return [];
      }

      try {
        const sessionsWithScreenshots = await Promise.all(
          sessions.map(async (session) => {
            if (!session._id) {
              throw new Error('Session without ID encountered');
            }

            // Get the session-specific database
            const sessionDb = fireproof(getSessionDatabaseName(session._id));

            // Query screenshots from the session database
            const result = await sessionDb.query('type', {
              key: 'screenshot',
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
        return sessionsWithScreenshots.sort((a, b) => {
          const timeA = a.session.created_at || 0;
          const timeB = b.session.created_at || 0;
          return timeB - timeA;
        });
      } catch (err) {
        // Proper error handling
        setError(err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    []
  ); // No dependencies needed as this doesn't rely on changing state/props

  // Fetch screenshots for each session from their respective databases
  useEffect(() => {
    // Don't fetch if we're still loading docs or have no session docs
    if (isDocsLoading || !sessionDocs || sessionDocs.length === 0) {
      setAllSessionsWithScreenshots([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Fetch data and update state if component is still mounted
    (async () => {
      try {
        const sortedSessions = await fetchSessionScreenshots(sessionDocs);
        if (isMounted) {
          setAllSessionsWithScreenshots(sortedSessions);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [sessionDocs, fetchSessionScreenshots, isDocsLoading]);

  // Memoize the filtered sessions based on the favorites flag
  // This avoids unnecessary recomputations and re-renders
  const groupedSessions = useMemo(() => {
    if (allSessionsWithScreenshots.length === 0) {
      return [];
    }

    // Apply the favorites filter
    return justFavorites
      ? allSessionsWithScreenshots.filter((item) => item.session.favorite)
      : allSessionsWithScreenshots;
  }, [allSessionsWithScreenshots, justFavorites]);

  return {
    database,
    groupedSessions,
    isLoading: isLoading || isDocsLoading,
    error,
  };
}
