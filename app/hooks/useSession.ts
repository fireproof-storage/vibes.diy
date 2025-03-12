import { useState, useEffect, useCallback, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, SessionDocument, Segment } from '../types/chat';

// Define document type for user messages
interface UserMessageDocument {
  type: 'user';
  session_id: string;
  text: string;
  created_at: number;
}

export type AiChatMessageDocument = {
  type: 'ai';
  session_id: string;
  text?: string; // Raw text content 
  created_at: number;
};


export function useSession(initialSessionId: string | undefined) {
  const { database, useDocument, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  const {
    doc: session,
    merge: mergeSession,
    save: saveSession,
  } = useDocument<SessionDocument>((initialSessionId
    ? { _id: initialSessionId }
    : { type: 'session', title: 'New Chat', created_at: Date.now() }) as SessionDocument);


const { doc: nextAiMessage, merge: mergeAiMessage, save: saveAiMessage } = useDocument<AiChatMessageDocument>({
  type: 'ai',
  session_id: session._id,
  created_at: Date.now()
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
      const file = new File([blob], 'screenshot.png', { type: 'image/png', lastModified: Date.now() });

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

  // Add a user message with raw message content
  const addUserMessage = useCallback(
    async (rawMessage: string) => {
      if (!session._id) {
        await mergeSession({ 
          prompt: rawMessage,
          created_at: Date.now()
        });  
      } else {
       await database.put({
          type: 'user',
          session_id: session._id,
          text: rawMessage,
          created_at: Date.now(),
        } as UserMessageDocument);
      }
    },
    [session._id, database, mergeSession]
  );


  const updateStreamingMessage = useCallback(
      async (rawMessage: string) => {
        await mergeAiMessage({ text: rawMessage });
      },
      [mergeAiMessage]
    );
    
  return {
    session,
    docs,
    updateTitle,
    addScreenshot,
    addUserMessage,
    updateStreamingMessage
  };
}
