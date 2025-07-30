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
import type { Database, DocResponse, DocWithId } from 'use-fireproof';

interface SessionView {
  _id: string;
  title: string;
  publishedUrl?: string;
  firehoseShared?: boolean;
}

interface UseSession {
  // // Session information
  session: SessionView;
  docs: ChatMessageDocument[];

  // // Databases
  sessionDatabase: Database;
  openSessionDatabase: () => void;

  // // Session management functions
  updateTitle: (title: string) => Promise<void>;
  updatePublishedUrl: (publishedUrl: string) => Promise<void>;
  updateFirehoseShared: (firehoseShared: boolean) => Promise<void>;
  addScreenshot: (screenshotData: string | null) => Promise<void>;
  // // Message management
  userMessage: UserChatMessageDocument;
  submitUserMessage: () => Promise<void>;
  mergeUserMessage: (newDoc: Partial<UserChatMessageDocument>) => void;
  // saveUserMessage: (newDoc: UserChatMessageDocument) => Promise<void>;
  aiMessage: AiChatMessageDocument;
  submitAiMessage: (e?: Event) => Promise<void>;
  mergeAiMessage: (newDoc: Partial<AiChatMessageDocument>) => void;
  saveAiMessage: (
    existingDoc?: DocWithId<AiChatMessageDocument> | undefined
  ) => Promise<DocResponse>;
  // // Vibe document management
  vibeDoc: VibeDocument;
}

export function useSession(routedSessionId?: string): UseSession {
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

      (vibeDoc as any).title = title;
      (vibeDoc as any).encodedTitle = encodedTitle;

      await sessionDatabase.put(vibeDoc);
      mergeVibeDoc(vibeDoc);
    },
    [sessionDatabase, vibeDoc]
  );

  // Update published URL using the vibe document
  const updatePublishedUrl = useCallback(
    async (publishedUrl: string) => {
      (vibeDoc as any).publishedUrl = publishedUrl;

      await sessionDatabase.put(vibeDoc);
      mergeVibeDoc(vibeDoc);
    },
    [sessionDatabase, vibeDoc, mergeVibeDoc]
  );

  // Update firehose shared state using the vibe document
  const updateFirehoseShared = useCallback(
    async (firehoseShared: boolean) => {
      (vibeDoc as any).firehoseShared = firehoseShared;

      await sessionDatabase.put(vibeDoc);
      mergeVibeDoc(vibeDoc);
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
