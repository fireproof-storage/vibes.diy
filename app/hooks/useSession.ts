import { useCallback, useState } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type {
  UserChatMessageDocument,
  AiChatMessageDocument,
  SessionDocument,
} from '../types/chat';
import { getSessionDatabaseName } from '../utils/databaseManager';

export function useSession(routedSessionId: string | undefined) {
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
  } = useFireproof(sessionDbName);

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
  const { docs } = useSessionLiveQuery('session_id', { key: session._id });

  // Update session title (in main database)
  const updateTitle = useCallback(
    async (title: string) => {
      session.title = title;
      await mainDatabase.put(session);
      mergeSession({ title });
    },
    [mainDatabase, mergeSession, session]
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

  return {
    // Session information
    session,
    docs,

    // Databases
    mainDatabase,
    sessionDatabase,

    // Session management functions
    updateTitle,
    addScreenshot,

    // Message management
    userMessage,
    submitUserMessage,
    mergeUserMessage,
    aiMessage,
    submitAiMessage,
    mergeAiMessage,
    saveAiMessage,
  };
}
