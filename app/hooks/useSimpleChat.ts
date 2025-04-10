import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ChatMessageDocument, ChatState } from '../types/chat';
import type { UserSettings } from '../types/settings';
import { parseContent } from '../utils/segmentParser';
import { useSession } from './useSession';
import { useFireproof } from 'use-fireproof';
import { generateTitle } from '../utils/titleGenerator';
import { streamAI } from '../utils/streamHandler';
import { useApiKey } from './useApiKey';
import { getCredits } from '../config/provisioning';

// Import our custom hooks
import { useSystemPromptManager } from './useSystemPromptManager';
import { useMessageSelection } from './useMessageSelection';
import { useThrottledUpdates } from './useThrottledUpdates';

// Constants
const CODING_MODEL = 'anthropic/claude-3.7-sonnet';
const TITLE_MODEL = 'google/gemini-2.0-flash-lite-001';

/**
 * Simplified chat hook that focuses on data-driven state management
 * Uses session-based architecture with individual message documents
 * @returns ChatState object with all chat functionality and state
 */
export function useSimpleChat(sessionId: string | undefined): ChatState {
  // Get API key
  // For anonymous users: uses the sessionId (chat ID) as an identifier
  // For logged-in users: will use userId from auth once implemented
  // This approach ensures anonymous users get one API key with limited credits
  // and logged-in users will get proper credit assignment based on their ID
  const userId = undefined; // Will come from auth when implemented
  const { apiKey } = useApiKey(userId || sessionId);

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

  // Reference for input element
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get settings document
  const { useDocument } = useFireproof(mainDatabase);
  const { doc: settingsDoc } = useDocument<UserSettings>({ _id: 'user_settings' });

  // State hooks
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string>('');
  const [pendingAiMessage, setPendingAiMessage] = useState<ChatMessageDocument | null>(null);

  // Derive model to use from settings or default
  const modelToUse = useMemo(
    () =>
      settingsDoc?.model && settingsDoc.model.trim() !== '' ? settingsDoc.model : CODING_MODEL,
    [settingsDoc?.model]
  );

  // Use our custom hooks
  const { ensureSystemPrompt } = useSystemPromptManager(settingsDoc);

  const { throttledMergeAiMessage, isProcessingRef } = useThrottledUpdates(mergeAiMessage);

  const {
    messages,
    selectedResponseDoc,
    selectedSegments,
    selectedCode,
    selectedDependencies,
    buildMessageHistory,
  } = useMessageSelection({
    docs,
    isStreaming,
    aiMessage,
    selectedResponseId,
    pendingAiMessage,
  });

  // Simple input handler
  const setInput = useCallback(
    (input: string) => {
      mergeUserMessage({ text: input });
    },
    [mergeUserMessage]
  );

  /**
   * Send a message and process the AI response
   */
  const sendMessage = useCallback(async (): Promise<void> => {
    if (!userMessage.text.trim()) return;
    if (!apiKey) {
      console.error('API key not available yet');
      return;
    }

    // Ensure we have a system prompt
    const currentSystemPrompt = await ensureSystemPrompt();

    // Set streaming state
    setIsStreaming(true);

    // Submit user message first
    return submitUserMessage()
      .then(() => {
        const messageHistory = buildMessageHistory();
        return streamAI(
          modelToUse,
          currentSystemPrompt,
          messageHistory,
          userMessage.text,
          (content) => throttledMergeAiMessage(content),
          apiKey || ''
        );
      })
      .then(async (finalContent) => {
        // Set processing flag to prevent infinite updates
        isProcessingRef.current = true;

        try {
          // Only do a final update if the current state doesn't match our final content
          if (aiMessage.text !== finalContent) {
            aiMessage.text = finalContent;
          }

          aiMessage.model = modelToUse;
          // Save to database
          const { id } = (await sessionDatabase.put(aiMessage)) as { id: string };
          // Update state with the saved message
          setPendingAiMessage({ ...aiMessage, _id: id });
          setSelectedResponseId(id);

          // Generate title if needed
          const { segments } = parseContent(aiMessage.text);
          if (!session?.title) {
            await generateTitle(segments, TITLE_MODEL, apiKey || '').then(updateTitle);
          }
        } finally {
          isProcessingRef.current = false;
        }
      })
      .catch((error) => {
        console.error('Error processing stream:', error);
        isProcessingRef.current = false;
        setPendingAiMessage(null);
        setSelectedResponseId('');
      })
      .finally(() => {
        if (apiKey) {
          getCredits(apiKey)
            .then((credits: { available: number; usage: number; limit: number }) => {
              console.log('Remaining credits:', credits);
            })
            .catch((error: Error) => {
              console.error('Failed to fetch credits:', error);
            });
        } else {
          console.error('API key not available to fetch credits');
        }

        setIsStreaming(false);
      });
  }, [
    userMessage.text,
    ensureSystemPrompt,
    setIsStreaming,
    submitUserMessage,
    buildMessageHistory,
    modelToUse,
    throttledMergeAiMessage,
    isProcessingRef,
    aiMessage,
    sessionDatabase,
    setPendingAiMessage,
    setSelectedResponseId,
    session?.title,
    updateTitle,
  ]);

  // Determine if code is ready for display
  const codeReady = useMemo(() => {
    return !isStreaming || selectedSegments.length > 2;
  }, [isStreaming, selectedSegments]);

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
