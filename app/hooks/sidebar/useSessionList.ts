import { useMemo } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../../config/env';
import type { SessionDocument } from '../../types/chat';

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
 * Uses a single efficient query that gets both data types together
 * @returns An object containing the grouped sessions and loading state
 */
export function useSessionList() {
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  // Use a single query to fetch both sessions and screenshots with a custom index function
  // For session docs: returns doc._id
  // For screenshot docs: returns doc.session_id
  // This creates a virtual index where sessions and screenshots share the same key value
  const { docs: sessionAndScreenshots } = useLiveQuery<SessionOrScreenshot>((doc) =>
    doc.type && doc.type === 'session' ? doc._id : (doc as any).session_id
  );

  // Group sessions and their associated screenshots together
  const groupedSessions = useMemo(() => {
    if (!sessionAndScreenshots || sessionAndScreenshots.length === 0) {
      return [];
    }

    const groups = new Map<string, GroupedSession>();

    // Process all documents to group screenshots with their sessions
    sessionAndScreenshots.forEach((doc) => {
      if (doc.type === 'screenshot' && doc.session_id) {
        // Handle screenshot document
        const sessionId = doc.session_id;
        let group = groups.get(sessionId);

        if (!group) {
          // Create a placeholder for this session if it doesn't exist yet
          group = {
            session: { _id: sessionId } as SessionDocument,
            screenshots: [],
          };
          groups.set(sessionId, group);
        }

        // Add screenshot to this session's group
        group.screenshots.push(doc);
      } else if (doc.type === 'session') {
        // Handle session document
        let group = groups.get(doc._id);

        if (!group) {
          // Create a new group if this session hasn't been seen yet
          group = {
            session: doc as SessionDocument,
            screenshots: [],
          };
          groups.set(doc._id, group);
        } else {
          // Update the session data if we already have a group with screenshots
          group.session = doc as SessionDocument;
        }
      }
    });

    // Convert map to array and sort by created_at (newest first)
    return Array.from(groups.values()).sort((a, b) => {
      const timeA = a.session.created_at || 0;
      const timeB = b.session.created_at || 0;
      return timeB - timeA;
    });
  }, [sessionAndScreenshots]);

  return {
    groupedSessions,
    count: groupedSessions.length,
  };
}
