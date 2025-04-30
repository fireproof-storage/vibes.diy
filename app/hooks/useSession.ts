import { useCallback, useState, useEffect } from 'react';
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
  } = useLazyFireproof(sessionDbName);

  // Automatically open the database if we have a routed session ID
  // This ensures existing sessions are loaded immediately
  // But prevents creating empty databases unnecessarily
  useEffect(() => {
    // Only open the database if we have a session from the URL
    // or if this is the result of a user action (not just page load)
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
  const {
    doc: vibeDoc,
    merge: mergeVibeDoc,
    save: saveVibeDoc,
    submit: submitVibeDoc,
  } = useSessionDocument<VibeDocument>({
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
      console.log('updateTitle session title:', title);
      // Encode the title for URL-friendly slug
      const encodedTitle = encodeTitle(title);
      console.log('Encoded title slug:', encodedTitle);

      // Update the vibe document using the merge function
      await mergeVibeDoc({
        title,
        encodedTitle,
      });
      
      // Save the changes
      await saveVibeDoc();
      console.log('Title update completed');
    },
    [mergeVibeDoc, saveVibeDoc]
  );

  // Update published URL using the vibe document
  const updatePublishedUrl = useCallback(
    async (publishedUrl: string) => {
      // Update the vibe document using the merge function
      await mergeVibeDoc({
        publishedUrl,
      });
      
      // Save the changes
      await saveVibeDoc();
    },
    [mergeVibeDoc, saveVibeDoc]
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

  interface SessionView {
    _id: string;
    title: string;
    publishedUrl?: string;
  }

  const session: SessionView = {
    _id: sessionId,
    title: vibeDoc?.title || '',
    publishedUrl: vibeDoc?.publishedUrl || '',
  };

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
    mergeVibeDoc,
    saveVibeDoc,
    submitVibeDoc,
  };
}
