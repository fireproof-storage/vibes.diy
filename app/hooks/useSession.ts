import { useCallback, useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    // @ts-expect-error using lazy fireproof
    console.log('Session database name:', sessionDatabase.inner?.name, sessionDatabase.name);
    // @ts-expect-error using lazy fireproof
  }, [sessionDatabase.inner.name]);

  // The database is now automatically initialized when routedSessionId is present
  // via the second parameter to useLazyFireproof
  // We keep the openSessionDatabase function available for manual initialization
  // when needed for other scenarios

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

  // Track render count to debug multiple initialization issues
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`[RENDER ${renderCountRef.current}] useSession render with sessionId: ${sessionId}`);
  });

  // Vibe document is managed directly with useState and database operations
  // Use a ref to track if we've already initialized the document
  const vibeDocInitializedRef = useRef(false);
  const [vibeDoc, setVibeDoc] = useState<VibeDocument>(() => {
    console.log(`[INIT] Creating initial vibeDoc state with timestamp: ${Date.now()}`);
    return {
      _id: 'vibe',
      title: '',
      encodedTitle: '',
      created_at: Date.now(),
      remixOf: '',
    };
  });
  
  // Load vibe document from database when session database is available
  useEffect(() => {
    // Skip if we've already initialized or don't have necessary dependencies
    if (!sessionDatabase || vibeDocInitializedRef.current) {
      console.log(`[LOAD] Skipping vibe doc load - initialized: ${vibeDocInitializedRef.current}, hasDB: ${!!sessionDatabase}`);
      return;
    }
    
    const loadVibeDoc = async () => {
      console.log(`[LOAD] Attempting to load vibe doc for session: ${sessionId}`);
      try {
        // Try to get existing vibe document from database
        const existingDoc = await sessionDatabase.get('vibe');
        if (existingDoc) {
          console.log('[LOAD] Loaded vibe document from database:', existingDoc);
          setVibeDoc(existingDoc as VibeDocument);
          vibeDocInitializedRef.current = true;
        }
      } catch (error) {
        // Document doesn't exist yet, which is fine for new sessions
        console.log('[LOAD] No existing vibe document found, using default');
        // Mark as initialized so we don't try to load again
        vibeDocInitializedRef.current = true;
      }
    };
    
    loadVibeDoc();
  }, [sessionDatabase, sessionId]);
  
  // Functions to update the vibe document
  // Use a ref to track the latest updates that need to be saved
  const pendingUpdatesRef = useRef<Partial<VibeDocument> | null>(null);
  
  const mergeVibeDoc = useCallback(
    async (updates: Partial<VibeDocument>) => {
      console.log('[MERGE] Updating vibeDoc with:', JSON.stringify(updates));
      // Store the updates in the ref for the next save operation
      pendingUpdatesRef.current = updates;
      // Update the state
      setVibeDoc(prevDoc => {
        const newDoc = { ...prevDoc, ...updates };
        console.log('[MERGE] New vibeDoc state:', JSON.stringify(newDoc));
        return newDoc;
      });
    },
    []
  );
  
  const saveVibeDoc = useCallback(
    async () => {
      if (sessionDatabase) {
        try {
          // Get the current state directly to avoid closure issues
          const currentVibeDoc = { ...vibeDoc };
          console.log('[SAVE] Current vibeDoc from state:', JSON.stringify(currentVibeDoc));
          console.log('[SAVE] Pending updates:', JSON.stringify(pendingUpdatesRef.current));
          
          // Check if there's an existing document first
          let existingDoc: VibeDocument | null = null;
          try {
            const doc = await sessionDatabase.get('vibe');
            existingDoc = doc as VibeDocument;
            console.log('[SAVE] Found existing vibe doc:', JSON.stringify(existingDoc));
          } catch (e) {
            console.log('[SAVE] No existing vibe doc found, will create new one');
          }
          
          // Determine what to save based on all available information
          let docToSave = currentVibeDoc;
          
          // If we have pending updates with a title, make sure those are included
          if (pendingUpdatesRef.current?.title) {
            docToSave = { ...docToSave, ...pendingUpdatesRef.current };
            console.log('[SAVE] Applied pending updates with title:', JSON.stringify(docToSave));
          }
          // If we have an existing doc with a title but our current doc has no title,
          // preserve the existing title
          else if (existingDoc?.title && !docToSave.title) {
            docToSave = { 
              ...docToSave, 
              title: existingDoc.title, 
              encodedTitle: existingDoc.encodedTitle 
            };
            console.log('[SAVE] Preserved existing title:', JSON.stringify(docToSave));
          }
            
          // Save the document
          const result = await sessionDatabase.put(docToSave);
          console.log('[SAVE] Saved vibe document to database:', JSON.stringify(docToSave), 'Result:', result);
          
          // Clear pending updates after successful save
          pendingUpdatesRef.current = null;
          
          // Update our state if the saved doc differs from current state
          if (JSON.stringify(docToSave) !== JSON.stringify(currentVibeDoc)) {
            console.log('[SAVE] Updating state to match saved document');
            setVibeDoc(docToSave);
          }
        } catch (error) {
          console.error('[SAVE] Error saving vibe document:', error);
        }
      } else {
        console.log('[SAVE] Cannot save vibe doc - no sessionDatabase available');
      }
    },
    [sessionDatabase, vibeDoc]
  );

  // Query messages from the session-specific database
  const { docs } = useSessionLiveQuery('session_id', { key: sessionId }) as {
    docs: ChatMessageDocument[];
  };

  // Update session title using the vibe document
  const updateTitle = useCallback(
    async (title: string) => {
      console.log(`[TITLE] Updating title to "${title}" for session ${sessionId}`);
      console.log(`[TITLE] Current vibeDoc before update:`, JSON.stringify(vibeDoc));
      
      // Encode the title for URL-friendly slug
      const encodedTitle = encodeTitle(title);
      console.log(`[TITLE] Encoded title slug: ${encodedTitle}`);

      // Create the updates object
      const updates = { title, encodedTitle };
      console.log('[TITLE] Title updates to apply:', JSON.stringify(updates));
      
      // Update the vibe document in state
      console.log('[TITLE] Merging title into vibeDoc state');
      await mergeVibeDoc(updates);
      
      // Wait a moment to ensure state update has processed
      await new Promise(resolve => setTimeout(resolve, 0));
      console.log(`[TITLE] vibeDoc state after merge:`, JSON.stringify(vibeDoc));

      // Save the changes to the database
      console.log('[TITLE] Saving updated vibeDoc to database');
      await saveVibeDoc();

      // Verify the update in the database
      try {
        console.log('[TITLE] Verifying database update');
        const savedDoc = await sessionDatabase.get('vibe') as VibeDocument;
        console.log('[TITLE] Vibe document from database after update:', JSON.stringify(savedDoc));
        
        // Final verification to ensure title was saved correctly
        if (savedDoc.title !== title) {
          console.log(`[TITLE] WARNING: Title mismatch after save. Expected "${title}" but got "${savedDoc.title}". Forcing update.`);
          
          // Force a direct database update as a last resort
          const forcedUpdate = { ...savedDoc, title, encodedTitle };
          await sessionDatabase.put(forcedUpdate);
          console.log('[TITLE] Forced title update completed');
          
          // Update state to match
          setVibeDoc(forcedUpdate);
        }
      } catch (error) {
        console.error('[TITLE] Error verifying vibe document update:', error);
      }
    },
    [mergeVibeDoc, saveVibeDoc, sessionDatabase, sessionId, vibeDoc]
  );

  // Update published URL using the vibe document
  const updatePublishedUrl = useCallback(
    async (publishedUrl: string) => {
      // Update the vibe document in state
      await mergeVibeDoc({
        publishedUrl,
      });

      // Save the changes to the database
      await saveVibeDoc();
      
      // Verify the update in the database
      try {
        const savedDoc = await sessionDatabase.get('vibe');
        console.log('Vibe document with updated URL:', savedDoc);
      } catch (error) {
        console.error('Error verifying published URL update:', error);
      }
    },
    [mergeVibeDoc, saveVibeDoc, sessionDatabase]
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
    title: vibeDoc.title,
    publishedUrl: vibeDoc.publishedUrl,
  };

  useEffect(() => {
    console.log('Session:', session, vibeDoc);
  }, [vibeDoc.title, session.title]);

  useEffect(() => {
    console.log('vibe doc:', vibeDoc);
  }, [vibeDoc]);

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
    mergeAiMessage, // used
    saveAiMessage,
    // Vibe document management
    vibeDoc,
    mergeVibeDoc,
    saveVibeDoc,
  };
}
