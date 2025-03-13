import { useState, useEffect, useCallback, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type {
  UserChatMessageDocument,
  AiChatMessageDocument,
  SessionDocument,
  Segment,
} from '../types/chat';

export function useSession(routedSessionId: string | undefined) {
  const { database, useDocument, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  const {
    doc: session,
    merge: mergeSession,
    save: saveSession,
  } = useDocument<SessionDocument>(
    (routedSessionId
      ? { _id: routedSessionId }
      : {
          _id: `${Date.now().toString(36).padStart(9, '0')}${Math.random().toString(36).slice(2, 11).padEnd(9, '0')}`,
          type: 'session',
          title: '',
          created_at: Date.now(),
        }) as SessionDocument
  );

  const {
    doc: userMessage,
    merge: mergeUserMessage,
    save: saveUserMessage,
    submit: submitUserMessage,
  } = useDocument<UserChatMessageDocument>({
    type: 'user',
    session_id: session._id,
    text: '',
    created_at: Date.now(),
  });

  const {
    doc: aiMessage,
    merge: mergeAiMessage,
    save: saveAiMessage,
    submit: submitAiMessage,
  } = useDocument<AiChatMessageDocument>({
    type: 'ai',
    session_id: session._id,
    text: '',
    created_at: Date.now(),
  });

  const { docs } = useLiveQuery('session_id', { key: session._id });

  // Update session title
  const updateTitle = useCallback(
    async (title: string) => {
      await mergeSession({ title });
      await saveSession();
    },
    [mergeSession, saveSession]
  );

  // Add a screenshot to the session
  const addScreenshot = useCallback(
    async (screenshotData: string) => {
      if (!session._id) return;

      const response = await fetch(screenshotData);
      const blob = await response.blob();
      const file = new File([blob], 'screenshot.png', {
        type: 'image/png',
        lastModified: Date.now(),
      });

      await database.put({
        type: 'screenshot',
        session_id: session._id,
        _files: {
          screenshot: file,
        },
      });
    },
    [session._id, database]
  );

  // const updateAiMessage = useCallback(
  //   async (rawMessage: string) => {
  //     await mergeAiMessage({ text: rawMessage });
  //   },
  //   [mergeAiMessage]
  // );

  return {
    session,
    docs,
    updateTitle,
    addScreenshot,
    userMessage,
    submitUserMessage,
    mergeUserMessage,
    // updateAiMessage,
    aiMessage,
    submitAiMessage,
    mergeAiMessage,
  };
}
