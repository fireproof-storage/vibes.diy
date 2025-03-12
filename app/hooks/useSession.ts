import { useState, useEffect, useCallback, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, AiChatMessage, SessionDocument, Segment } from '../types/chat';

export function useSession(sessionId: string | null) {
  const { database, useDocument } = useFireproof(FIREPROOF_CHAT_HISTORY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  console.log('useSession: initialized with sessionId:', sessionId);

  // Use a different approach to avoid TypeScript errors
  let initialDoc: any = sessionId 
    ? { _id: sessionId, type: 'session', timestamp: Date.now() }
    : { type: 'session', title: 'New Chat', timestamp: Date.now() };

  // Use useDocument hook to interact with the session document
  const {
    doc: session,
    merge: mergeSession,
    save: saveSession,
  } = useDocument<SessionDocument>(initialDoc);

  // Log when session document changes
  useEffect(() => {
    console.log('useSession: session document:', session);
  }, [session]);

  // Load session data
  const loadSession = useCallback(async () => {
    if (!sessionId) return null;
    
    console.log('useSession: Loading session:', sessionId);
    setLoading(true);
    try {
      // No need to fetch manually, useDocument handles this
      console.log('useSession: Session loaded:', session);
      return session;
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId, session]);

  // Update session title
  const updateTitle = useCallback(async (title: string) => {
    if (!sessionId) return;
    
    try {
      await mergeSession({ title: title || 'Untitled Chat' });
      await saveSession();
    } catch (err) {
      console.error('Error updating session title:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, mergeSession, saveSession]);

  // Update session metadata
  const updateMetadata = useCallback(async (metadata: Partial<Omit<SessionDocument, '_id'>>) => {
    if (!sessionId) return;
    
    try {
      await mergeSession(metadata);
      await saveSession();
    } catch (err) {
      console.error('Error updating session metadata:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, mergeSession, saveSession]);

  // Add a screenshot to the session
  const addScreenshot = useCallback(async (screenshotData: string) => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(screenshotData);
      const blob = await response.blob();
      const file = new File([blob], 'screenshot.png', { type: 'image/png' });

      await database.put({
        type: 'screenshot',
        session_id: sessionId,
        _files: {
          screenshot: file,
        },
      });
    } catch (err) {
      console.error('Error adding screenshot:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, database]);

  // Create a new session
  const createSession = useCallback(async (title: string = 'New Chat') => {
    try {
      console.log('useSession: Creating new session with title:', title);
      await mergeSession({ 
        title, 
        timestamp: Date.now(),
        type: 'session'
      });
      const result = await saveSession();
      console.log('useSession: Session created with ID:', result.id);
      return result.id;
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }, [mergeSession, saveSession]);

  return {
    session,
    loading,
    error,
    loadSession,
    updateTitle,
    updateMetadata,
    addScreenshot,
    createSession,
    database
  };
} 