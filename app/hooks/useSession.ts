import { useCallback, useState, useEffect } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type {
  AiChatMessageDocument,
  SessionDocument,
  UserChatMessageDocument,
  VibeDocument,
  ChatMessageDocument,
} from '../types/chat';
import { getSessionDatabaseName } from '../utils/databaseManager';
import { useLazyFireproof } from './useLazyFireproof';
import { encodeTitle } from '../components/SessionSidebar/utils';

export function useSession(routedSessionId?: string) {
  const { useDocument: useMainDocument, database: mainDatabase } =
    useFireproof(FIREPROOF_CHAT_HISTORY);

  const [generatedSessionId] = useState(
    () =>
      `${Date.now().toString(36).padStart(9, 'f')}${Math.random().toString(36).slice(2, 11).padEnd(9, '0')}`
  );

  const sessionId = routedSessionId || generatedSessionId;
  const sessionDbName = getSessionDatabaseName(sessionId);
  const {
    database: sessionDatabase,
    useDocument: useSessionDocument,
    useLiveQuery: useSessionLiveQuery,
    open: openSessionDatabase,
  } = useLazyFireproof(sessionDbName);

  // Automatically open the database if we have a routed session ID
  // This ensures existing sessions are loaded immediately
  // Use useEffect to ensure this only runs once during initialization
  useEffect(() => {
    if (routedSessionId) {
      openSessionDatabase();
    }
  }, [routedSessionId, openSessionDatabase]);

  // Session document is stored in the main database
  const { doc: session, merge: mergeSession } = useMainDocument<SessionDocument>(
    (routedSessionId
      ? { _id: routedSessionId }
      : {
          _id: sessionId,
          type: 'session',
          title: '',
          created_at: Date.now(),
        }) as SessionDocument
  );

  // User message is stored in the session-specific database
  const {
    doc: userMessage,
    merge: mergeUserMessage,
    submit: submitUserMessage,
  } = useSessionDocument<UserChatMessageDocument>({
    type: 'user',
    session_id: sessionId,
    text: '',
    created_at: Date.now(),
  });

  // AI message is stored in the session-specific database
  const {
    doc: aiMessage,
    merge: mergeAiMessage,
    save: saveAiMessage,
    submit: submitAiMessage,
  } = useSessionDocument<AiChatMessageDocument>({
    type: 'ai',
    session_id: sessionId,
    text: '',
    created_at: Date.now(),
  });

  // Query messages from the session-specific database
  const { docs } = useSessionLiveQuery('session_id', { key: session._id }) as {
    docs: ChatMessageDocument[];
  };

  // Update session title (in session database only)
  const updateTitle = useCallback(
    async (title: string) => {
      // Update local session state for UI
      mergeSession({ title });

      // Encode the title for URL-friendly slug
      const encodedTitle = encodeTitle(title);

      // Store title in the vibe document
      const currentVibeDoc = await sessionDatabase.get<VibeDocument>('vibe').catch(() => null);
      if (currentVibeDoc) {
        currentVibeDoc.title = title;
        currentVibeDoc.encodedTitle = encodedTitle;
        await sessionDatabase.put(currentVibeDoc);
      } else {
        await sessionDatabase.put({
          _id: 'vibe',
          title,
          encodedTitle,
          created_at: Date.now(),
        });
      }
    },
    [mergeSession, sessionDatabase]
  );

  // Update published URL (in vibe document in session database only)
  const updatePublishedUrl = useCallback(
    async (publishedUrl: string) => {
      // Update local session state for UI
      mergeSession({ publishedUrl });

      // Store the URL in the vibe document in the session database
      const currentVibeDoc = await sessionDatabase.get<VibeDocument>('vibe').catch(() => null);
      if (currentVibeDoc) {
        currentVibeDoc.publishedUrl = publishedUrl;
        await sessionDatabase.put(currentVibeDoc);
      } else {
        await sessionDatabase.put({
          _id: 'vibe',
          title: session.title || '',
          publishedUrl,
          created_at: Date.now(),
        });
      }
    },
    [mergeSession, session, sessionDatabase]
  );

  // Add a screenshot to the session (in session-specific database)
  const addScreenshot = useCallback(
    async (screenshotData: string | null) => {
      if (!sessionId || !screenshotData) return;

      try {
        const response = await fetch(screenshotData);
        const blob = await response.blob();
        const file = new File([blob], 'screenshot.png', {
          type: 'image/png',
          lastModified: Date.now(),
        });
        const screenshot = {
          type: 'screenshot',
          session_id: sessionId,
          _files: {
            screenshot: file,
          },
        };
        await sessionDatabase.put(screenshot);
      } catch (error) {
        console.error('Failed to process screenshot:', error);
      }
    },
    [sessionId, sessionDatabase]
  );

  // Wrap submitUserMessage to ensure database is opened before first write
  const wrappedSubmitUserMessage = useCallback(async () => {
    // Database will be automatically opened on first write via the LazyDB wrapper
    // This explicit call is optional but makes the intent clear
    return submitUserMessage();
  }, [submitUserMessage]);

  return {
    // Session information
    session,
    docs,

    // Databases
    mainDatabase,
    sessionDatabase,
    openSessionDatabase,

    // Session management functions
    updateTitle,
    updatePublishedUrl,
    addScreenshot,

    // Message management
    userMessage,
    submitUserMessage: wrappedSubmitUserMessage,
    mergeUserMessage,
    aiMessage,
    submitAiMessage,
    mergeAiMessage,
    saveAiMessage,
  };
}
