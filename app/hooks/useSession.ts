import { useCallback, useState, useEffect, useMemo } from 'react';
import type {
  AiChatMessageDocument,
  UserChatMessageDocument,
  VibeDocument,
  ChatMessageDocument,
} from '../types/chat';
import { getSessionDatabaseName } from '../utils/databaseManager';
import { useLazyFireproof } from './useLazyFireproof';
import { encodeTitle } from '../components/SessionSidebar/utils';

export function useSession(routedSessionId?: string) {
  const [generatedSessionId] = useState(
    () =>
      `${Date.now().toString(36).padStart(9, 'f')}${Math.random().toString(36).slice(2, 11).padEnd(9, '0')}`
  );

  // Using useState to track the effective sessionId and ensure it updates properly
  // when routedSessionId changes from undefined to a real ID
  const [effectiveSessionId, setEffectiveSessionId] = useState(
    routedSessionId || generatedSessionId
  );

  // Update effectiveSessionId whenever routedSessionId changes
  useEffect(() => {
    if (routedSessionId) {
      setEffectiveSessionId(routedSessionId);
    }
  }, [routedSessionId]);

  const sessionId = effectiveSessionId;
  const sessionDbName = getSessionDatabaseName(sessionId);
  const {
    database: sessionDatabase,
    useDocument: useSessionDocument,
    useLiveQuery: useSessionLiveQuery,
    open: openSessionDatabase,
  } = useLazyFireproof(sessionDbName, !!routedSessionId);

  // Explicitly open the database when a sessionId is provided
  useEffect(() => {
    if (routedSessionId) {
      openSessionDatabase();
    }
  }, [routedSessionId, openSessionDatabase]);

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

  // Vibe document is stored in the session-specific database
  const { doc: vibeDoc, merge: mergeVibeDoc } = useSessionDocument<VibeDocument>({
    _id: 'vibe',
    title: '',
    encodedTitle: '',
    created_at: Date.now(),
    remixOf: '',
  });

  // Query messages from the session-specific database
  const { docs } = useSessionLiveQuery('session_id', { key: sessionId }) as {
    docs: ChatMessageDocument[];
  };

  // Update session title using the vibe document
  const updateTitle = useCallback(
    async (title: string) => {
      const encodedTitle = encodeTitle(title);

      // Create a new object instead of mutating
      const updatedDoc = {
        ...vibeDoc,
        title: title,
        encodedTitle: encodedTitle,
      };

      // Call merge first to trigger immediate UI update
      mergeVibeDoc(updatedDoc);

      // Then persist to database
      await sessionDatabase.put(updatedDoc);
    },
    [sessionDatabase, vibeDoc, mergeVibeDoc]
  );

  // Update published URL using the vibe document
  const updatePublishedUrl = useCallback(
    async (publishedUrl: string) => {
      // Create a new object instead of mutating
      const updatedDoc = {
        ...vibeDoc,
        publishedUrl: publishedUrl,
      };

      // Call merge first to trigger immediate UI update
      mergeVibeDoc(updatedDoc);

      // Then persist to database
      await sessionDatabase.put(updatedDoc);
    },
    [sessionDatabase, vibeDoc, mergeVibeDoc]
  );

  // Update firehose shared state using the vibe document
  const updateFirehoseShared = useCallback(
    async (firehoseShared: boolean) => {
      // Create a new object instead of mutating
      const updatedDoc = {
        ...vibeDoc,
        firehoseShared: firehoseShared,
      };

      // Call merge first to trigger immediate UI update
      mergeVibeDoc(updatedDoc);

      // Then persist to database
      await sessionDatabase.put(updatedDoc);
    },
    [sessionDatabase, vibeDoc, mergeVibeDoc]
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
    return submitUserMessage();
  }, [submitUserMessage]);

  interface SessionView {
    _id: string;
    title: string;
    publishedUrl?: string;
    firehoseShared?: boolean;
  }

  const session: SessionView = useMemo(
    () => ({
      _id: sessionId,
      title: vibeDoc.title,
      publishedUrl: vibeDoc.publishedUrl,
      firehoseShared: vibeDoc.firehoseShared,
    }),
    [sessionId, vibeDoc.title, vibeDoc.publishedUrl, vibeDoc.firehoseShared]
  );

  return {
    // Session information
    session,
    docs,

    // Databases
    sessionDatabase,
    openSessionDatabase,

    // Session management functions
    updateTitle,
    updatePublishedUrl,
    updateFirehoseShared,
    addScreenshot,
    // Message management
    userMessage,
    submitUserMessage: wrappedSubmitUserMessage,
    mergeUserMessage,
    aiMessage,
    submitAiMessage,
    mergeAiMessage,
    saveAiMessage,
    // Vibe document management
    vibeDoc,
  };
}
