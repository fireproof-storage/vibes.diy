import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Segment, ChatMessageDocument, ChatState } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import { useSession } from './useSession';
import { useFireproof } from 'use-fireproof';
import { generateTitle } from '../utils/titleGenerator';
import { processStream, callOpenRouterAPI } from '../utils/streamHandler';

const CODING_MODEL = 'anthropic/claude-3.7-sonnet';
const TITLE_MODEL = 'google/gemini-2.0-flash-lite-001';
/**
 * Simplified chat hook that focuses on data-driven state management
 * Uses session-based architecture with individual message documents
 * @returns ChatState object with all chat functionality and state
 */
export function useSimpleChat(sessionId: string | undefined): ChatState {
  // Get session data
  const {
    session,
    updateTitle,
    docs,
    userMessage,
    mergeUserMessage,
    submitUserMessage,
    mergeAiMessage,
    addScreenshot,
    sessionDatabase,
    mainDatabase,
    aiMessage,
  } = useSession(sessionId);

  // First declare ALL ref hooks to maintain hook order consistency
  const streamBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get settings document with proper type definition
  const { useDocument } = useFireproof(mainDatabase);
  const { doc: settingsDoc } = useDocument<{
    _id: string;
    stylePrompt?: string;
    userPrompt?: string;
  }>({ _id: 'user_settings' });

  // Then declare state hooks
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string>(''); // default most recent
  const [pendingAiMessage, setPendingAiMessage] = useState<ChatMessageDocument | null>(null);

  // The list of messages for the UI: docs + streaming message if active
  const messages = useMemo(() => {
    const baseDocs = docs.filter(
      (doc: any) => doc.type === 'ai' || doc.type === 'user'
    ) as unknown as ChatMessageDocument[];
    return isStreaming && aiMessage.text.length > 0 ? [...baseDocs, aiMessage] : baseDocs;
  }, [docs, isStreaming, aiMessage.text]);

  const selectedResponseDoc = useMemo(() => {
    // Priority 1: Explicit user selection (from confirmed docs)
    if (selectedResponseId) {
      const foundInDocs = docs.find(
        (doc: any) => doc.type === 'ai' && doc._id === selectedResponseId
      );
      if (foundInDocs) return foundInDocs;
      // If user selected an ID not (yet?) in docs, ignore it for now and proceed to defaults
      // This prevents showing inconsistent state if docs haven't updated
    }

    // Priority 2: Pending message (if no valid user selection)
    if (pendingAiMessage) {
      return pendingAiMessage;
    }

    // Priority 3: Streaming message (if no valid user selection and not pending)
    if (isStreaming) {
      return aiMessage;
    }

    // Priority 4: Default to latest AI message from docs (if no valid selection, not pending, not streaming)
    const latestAiDoc = docs.filter((doc: any) => doc.type === 'ai').reverse()[0];
    return latestAiDoc;
  }, [selectedResponseId, docs, pendingAiMessage, isStreaming, aiMessage]) as
    | ChatMessageDocument
    | undefined;

  const setInput = useCallback(
    (input: string) => {
      mergeUserMessage({ text: input });
    },
    [mergeUserMessage]
  );

  // Process docs into messages for the UI
  const filteredDocs = docs.filter((doc: any) => doc.type === 'ai' || doc.type === 'user');
  const buildMessageHistory = useCallback(() => {
    return filteredDocs.map((msg: any) => ({
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text || '',
    }));
  }, [filteredDocs]);

  const { selectedSegments, selectedCode, selectedDependencies } = useMemo(() => {
    const { segments, dependenciesString } = selectedResponseDoc
      ? parseContent(selectedResponseDoc.text)
      : { segments: [], dependenciesString: '' };

    const code =
      segments.find((segment) => segment.type === 'code') || ({ content: '' } as Segment);

    const dependencies = dependenciesString ? parseDependencies(dependenciesString) : {};

    return {
      selectedSegments: segments,
      selectedCode: code,
      selectedDependencies: dependencies,
    };
  }, [selectedResponseDoc]);

  // Throttled update function with fixed delay and debouncing
  // Reset system prompt when settings change
  useEffect(() => {
    if (settingsDoc && systemPrompt) {
      // Only reset if we already have a system prompt (don't trigger on initial load)
      const loadNewPrompt = async () => {
        const newPrompt = await makeBaseSystemPrompt(CODING_MODEL, settingsDoc);
        setSystemPrompt(newPrompt);
      };
      loadNewPrompt();
    }
  }, [settingsDoc, systemPrompt, CODING_MODEL]);

  const throttledMergeAiMessage = useCallback(
    (content: string) => {
      // Store content in ref to ensure latest content is always available
      streamBufferRef.current = content;

      // If we're already processing a database operation, don't trigger more updates
      if (isProcessingRef.current) {
        return;
      }

      // Clear any pending timeout to implement proper debouncing
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }

      // Throttle parameters
      const THROTTLE_DELAY = 10; // Increased from 10ms for better stability
      const MIN_UPDATE_INTERVAL = 50; // Minimum time between updates

      // Add minimum time between updates check
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

      // Calculate delay - use a longer delay if we've updated recently
      let delay = THROTTLE_DELAY;

      if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
        // If we've updated too recently, use adaptive delay
        delay = Math.max(
          MIN_UPDATE_INTERVAL - timeSinceLastUpdate + THROTTLE_DELAY,
          MIN_UPDATE_INTERVAL
        );
      }

      // Schedule update with calculated delay
      updateTimeoutRef.current = setTimeout(() => {
        // Capture the current content at time of execution
        const currentContent = streamBufferRef.current;

        // Record update time before the actual update
        lastUpdateTimeRef.current = Date.now();

        // Only update if the content has actually changed
        mergeAiMessage({ text: currentContent });
      }, delay);
    },
    [mergeAiMessage]
  );

  /**
   * Send a message and process the AI response
   * Returns a promise that resolves when the entire process is complete, including title generation
   */
  const sendMessage = useCallback(async (): Promise<void> => {
    if (!userMessage.text.trim()) return;

    // First, ensure we have the system prompt
    // Instead of setting state and immediately using it, get the value and use it directly
    let currentSystemPrompt = systemPrompt;
    if (!currentSystemPrompt) {
      if (import.meta.env.MODE === 'test') {
        currentSystemPrompt = 'Test system prompt';
        setSystemPrompt(currentSystemPrompt);
      } else {
        // Pass the settings document to makeBaseSystemPrompt
        currentSystemPrompt = await makeBaseSystemPrompt(CODING_MODEL, settingsDoc);
        setSystemPrompt(currentSystemPrompt);
      }
    }

    // Reset stream buffer and set streaming state
    streamBufferRef.current = '';
    setIsStreaming(true);

    // Submit user message first
    return submitUserMessage()
      .then(() => {
        const messageHistory = buildMessageHistory();
        // Use the locally captured system prompt value, not the state variable
        return callOpenRouterAPI(
          CODING_MODEL,
          currentSystemPrompt,
          messageHistory,
          userMessage.text
        );
      })
      .then((response) => {
        return processStream(response, (content) => {
          // Append to buffer and use throttled update
          streamBufferRef.current += content;
          throttledMergeAiMessage(streamBufferRef.current);
        });
      })
      .then(async () => {
        // Set processing flag to prevent infinite updates
        isProcessingRef.current = true;

        try {
          // Only do a final update if the current state doesn't match our buffer
          if (aiMessage.text !== streamBufferRef.current) {
            // First update the aiMessage object (no state update)
            aiMessage.text = streamBufferRef.current;
          }

          // Then persist to session database
          if (sessionDatabase) {
            // Assert the return type to include the document id
            const { id } = (await sessionDatabase.put(aiMessage)) as { id: string };
            // Capture the completed message *after* persistence, using the returned id
            setPendingAiMessage({ ...aiMessage, _id: id });
            // HACK: Always select the message that just finished streaming
            setSelectedResponseId(id);
          } else {
            console.error('Session db missing');
          }

          // Finally, generate title if needed and handle auto-selection
          const { segments } = parseContent(aiMessage.text);

          if (!session?.title) {
            await generateTitle(segments, TITLE_MODEL).then(updateTitle);
          }
        } finally {
          // Always clear the processing flag
          isProcessingRef.current = false;
        }
      })
      .catch((error) => {
        console.error('Error processing stream:', error);
        isProcessingRef.current = false;
        // Clear pending message and selection on error
        setPendingAiMessage(null);
        setSelectedResponseId('');
      })
      .finally(() => {
        setIsStreaming(false);
      });
  }, [
    userMessage.text,
    systemPrompt,
    setSystemPrompt,
    streamBufferRef,
    setIsStreaming,
    submitUserMessage,
    buildMessageHistory,
    throttledMergeAiMessage,
    aiMessage,
    sessionDatabase,
    session?.title,
    updateTitle,
    settingsDoc,
    setSelectedResponseId,
  ]);

  // TODO: make a version of this that only saves the first
  // for the given message source. so one each message.
  // const addFirstScreenshot = useCallback(
  //   async (screenshotData: string) => {
  //     const { rows: screenshots } = await database.query((doc: any) => [doc.session_id, doc.type], {
  //       key: [session._id, 'screenshot'],
  //     });
  //     if (screenshots.length === 0) {
  //       addScreenshot(screenshotData);
  //     }
  //   },
  //   [session._id, database, addScreenshot]
  // );

  const codeReady = useMemo(() => {
    return !isStreaming || selectedSegments.length > 2;
  }, [isStreaming, selectedSegments]);

  // Cleanup any pending updates when the component unmounts
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, []);

  // Effect to clear pending message once it appears in the main docs list
  useEffect(() => {
    if (pendingAiMessage && docs.some((doc: any) => doc._id === pendingAiMessage._id)) {
      setPendingAiMessage(null);
    }
  }, [docs, pendingAiMessage]);

  return {
    sessionId: session._id,
    addScreenshot,
    docs: messages,
    setSelectedResponseId,
    selectedResponseDoc,
    selectedSegments,
    selectedCode,
    selectedDependencies,
    input: userMessage.text,
    setInput,
    isStreaming,
    codeReady,
    sendMessage,
    inputRef,
    title: session?.title || '',
  };
}
