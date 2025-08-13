import { useCallback, useState, useEffect, useRef } from 'react';
import type {
  AiChatMessageDocument,
  UserChatMessageDocument,
  VibeDocument,
  ChatMessageDocument,
} from '../types/chat';
import { getSessionDatabaseName } from '../utils/databaseManager';
import { useFireproof } from 'use-fireproof';
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
  // Non-lazy initialization to make storage side effects observable
  // Initialize via useFireproof(sessionDbName) to standardize eager init
  const {
    database: sessionDatabase,
    useDocument: useSessionDocument,
    useLiveQuery: useSessionLiveQuery,
  } = useFireproof(sessionDbName);

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

  // Stabilize merge function and vibe document with refs to avoid recreating callbacks
  const mergeRef = useRef(mergeVibeDoc);
  useEffect(() => {
    mergeRef.current = mergeVibeDoc;
  }, [mergeVibeDoc]);

  const vibeRef = useRef(vibeDoc);
  useEffect(() => {
    vibeRef.current = vibeDoc;
  }, [vibeDoc]);

  // Update session title using the vibe document
  const updateTitle = useCallback(
    async (title: string, isManual: boolean = false) => {
      const base = vibeRef.current;
      const encodedTitle = encodeTitle(title);
      const updatedDoc = {
        ...base,
        title,
        encodedTitle,
        titleSetManually: isManual,
      } as VibeDocument;

      // Merge first for immediate UI update, then persist
      mergeRef.current(updatedDoc);
      await sessionDatabase.put(updatedDoc);
    },
    [sessionDatabase]
  );

  // Update published URL using the vibe document
  const updatePublishedUrl = useCallback(
    async (publishedUrl: string) => {
      const base = vibeRef.current;
      const updatedDoc = { ...base, publishedUrl } as VibeDocument;
      mergeRef.current(updatedDoc);
      await sessionDatabase.put(updatedDoc);
    },
    [sessionDatabase]
  );

  // Update firehose shared state using the vibe document
  const updateFirehoseShared = useCallback(
    async (firehoseShared: boolean) => {
      const base = vibeRef.current;
      const updatedDoc = { ...base, firehoseShared } as VibeDocument;
      mergeRef.current(updatedDoc);
      await sessionDatabase.put(updatedDoc);
    },
    [sessionDatabase]
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

  const session: SessionView = {
    _id: sessionId,
    title: vibeDoc.title,
    publishedUrl: vibeDoc.publishedUrl,
    firehoseShared: vibeDoc.firehoseShared,
  };

  return {
    // Session information
    session,
    docs,

    // Databases
    sessionDatabase,

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
