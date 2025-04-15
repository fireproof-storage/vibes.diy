import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ChatMessageDocument, ChatState } from '../types/chat';
import type { UserSettings } from '../types/settings';
import { parseContent } from '../utils/segmentParser';
import { useRuntimeErrors, type RuntimeError, type ErrorCategory } from './useRuntimeErrors';
import { useSession } from './useSession';
import { useFireproof } from 'use-fireproof';
import { generateTitle } from '../utils/titleGenerator';
import { streamAI } from '../utils/streamHandler';
import { useApiKey } from './useApiKey';
import { useAuth } from './useAuth';
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
  // Get userId from auth system
  const { userId, isAuthenticated } = useAuth();

  // Get API key
  // For anonymous users: uses the sessionId (chat ID) as an identifier
  // For logged-in users: uses userId from auth
  // This approach ensures anonymous users get one API key with limited credits
  // and logged-in users will get proper credit assignment based on their ID
  const { apiKey, refreshKey } = useApiKey(userId);

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

  // Function to save errors as system messages to the session database
  const saveErrorAsSystemMessage = useCallback(
    async (error: RuntimeError, category: ErrorCategory) => {
      if (!sessionDatabase) return;

      // Format the error message
      const errorType = error.errorType || 'Unknown';
      const errorReason = error.reason || 'Unknown reason';
      const errorMessage = error.message || 'No message';
      const errorSource = error.source || 'Unknown source';

      // Create a readable error message for the AI
      const systemMessageText = `ERROR [${category}]: ${errorType}\n${errorMessage}\n${errorReason}\nSource: ${errorSource}\nStack: ${error.stack || 'No stack trace'}\nTimestamp: ${error.timestamp}`;

      // Create a system message document
      const systemMessage = {
        type: 'system',
        session_id: sessionId || '',
        text: systemMessageText,
        created_at: Date.now(),
        errorType: errorType,
        errorCategory: category,
      };

      // Save to the session database
      try {
        await sessionDatabase.put(systemMessage);
        // Saved successfully
      } catch (err) {
        console.error('Failed to save error as system message:', err);
      }
    },
    [sessionDatabase, sessionId]
  );

  // State to track when errors were sent to the AI
  const [didSendErrors, setDidSendErrors] = useState(false);

  // Runtime error tracking with save callback and event-based clearing
  const { immediateErrors, advisoryErrors, addError } = useRuntimeErrors({
    onSaveError: saveErrorAsSystemMessage,
    didSendErrors,
  });

  // Reset didSendErrors after it's been processed
  useEffect(() => {
    if (didSendErrors) {
      // Small delay to ensure the errors are cleared before resetting
      const timer = setTimeout(() => {
        setDidSendErrors(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [didSendErrors]);

  // Reference for input element
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get settings document
  const { useDocument } = useFireproof(mainDatabase);
  const { doc: settingsDoc } = useDocument<UserSettings>({ _id: 'user_settings' });

  // State hooks
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string>('');
  const [pendingAiMessage, setPendingAiMessage] = useState<ChatMessageDocument | null>(null);
  const [needsNewKey, setNeedsNewKey] = useState<boolean>(false);
  const [needsLogin, setNeedsLogin] = useState<boolean>(false);

  // when needsNewKey turns true, call refreshKey or indicate login needed
  useEffect(() => {
    async function refresh() {
      if (needsNewKey) {
        if (isAuthenticated) {
          try {
            await refreshKey();
            setNeedsNewKey(false);
            setNeedsLogin(false);
          } catch (error) {
            console.error('Failed to refresh API key:', error);
            setNeedsLogin(true); // Also set login needed if refresh fails
          }
        } else {
          // Not authenticated and needs a new key
          setNeedsLogin(true);
        }
      }
    }
    refresh();
  }, [needsNewKey, refreshKey, isAuthenticated]);

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

  // Function to check credits and set needsNewKey if needed
  const checkCredits = useCallback(async () => {
    if (!apiKey) return;

    try {
      const credits = await getCredits(apiKey);
      console.log('💳 Credits:', credits);

      if (credits && credits.available <= 0.9) {
        setNeedsNewKey(true);
      }
    } catch (error) {
      // If we can't check credits, we might need a new key
      console.error('Error checking credits:', error);
      setNeedsNewKey(true);
    }
  }, [apiKey]);

  /**
   * Send a message and process the AI response
   * @param textOverride Optional text to use instead of the current userMessage
   */
  const sendMessage = useCallback(
    async (textOverride?: string): Promise<void> => {
      // Use provided text or fall back to userMessage.text
      const promptText = textOverride || userMessage.text;

      if (!promptText.trim()) return;
      if (!apiKey) {
        console.error('API key not available yet');
        return;
      }

      // Update user message with the text we're about to send if using an override
      if (textOverride) {
        mergeUserMessage({ text: textOverride });
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
            promptText,
            (content) => throttledMergeAiMessage(content),
            apiKey || ''
          );
        })
        .then(async (finalContent) => {
          // Set processing flag to prevent infinite updates
          isProcessingRef.current = true;

          try {
            // Check if finalContent is a string that could be JSON
            if (typeof finalContent === 'string' && finalContent.startsWith('{')) {
              try {
                const parsedContent = JSON.parse(finalContent);

                // Check if there's an error property
                if (parsedContent.error) {
                  console.log('Error in API response:', parsedContent);
                  setNeedsNewKey(true);
                  // Preserve the user message in case they want to retry
                  setInput(promptText);
                  // Return early with an error message
                  finalContent = `Error: ${JSON.stringify(parsedContent.error)}`;
                } else {
                  // If no error, continue with the parsed content
                  finalContent = parsedContent;
                }
              } catch (jsonError) {
                console.log('Error parsing JSON response:', jsonError, finalContent);
              }
            }

            // Handle empty responses with a friendly message
            if (
              !finalContent ||
              (typeof finalContent === 'string' && finalContent.trim().length === 0)
            ) {
              finalContent =
                'Sorry, there was an error processing your request. Please try again in a moment.';
            }

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
        .catch((error: any) => {
          // Log the error for debugging
          console.log('Error:', error);

          // Reset processing state
          isProcessingRef.current = false;
          setPendingAiMessage(null);
          setSelectedResponseId('');
        })
        .finally(() => {
          // Check credits status
          checkCredits();

          // Reset streaming state
          setIsStreaming(false);
        });
    },
    [
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
      checkCredits,
      apiKey,
    ]
  );

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

  // Check credits whenever we get an API key
  useEffect(() => {
    if (apiKey) {
      checkCredits();
    }
  }, [apiKey, checkCredits]);

  // Auto-send for immediate errors (with debounce)
  const debouncedSendRef = useRef<NodeJS.Timeout | null>(null);

  // Track which errors we've already sent to prevent duplicate sends
  const sentErrorsRef = useRef<Set<string>>(new Set());

  // Handle immediate errors with debounced auto-send
  useEffect(() => {
    // Exit early if we don't have any errors
    if (immediateErrors.length === 0) {
      return;
    }

    // Generate a fingerprint for the current set of errors to track if we've already handled them
    const errorFingerprint = immediateErrors
      .map((error) => `${error.errorType}:${error.message}`)
      .sort()
      .join('|');

    // Exit if we've already sent this exact set of errors - prevents duplicating messages
    if (sentErrorsRef.current.has(errorFingerprint)) {
      return;
    }

    // Determine if this is a syntax error
    const hasSyntaxErrors = immediateErrors.some((error) => error.errorType === 'SyntaxError');

    // Cancel any streaming if there are syntax errors
    if (isStreaming && hasSyntaxErrors) {
      setIsStreaming(false);
    }

    // Process all errors regardless of streaming state
    // Only start a debounce timer if one isn't already running
    if (!debouncedSendRef.current) {
      // Use a consistent debounce time to collect all related errors
      debouncedSendRef.current = setTimeout(async () => {
        try {
          // Add this error set to our tracking to prevent duplicate sends
          sentErrorsRef.current.add(errorFingerprint);

          // Simple prompt message - errors have already been saved as system messages
          const promptText = `Please help me fix the errors shown above. Simplify the code if necessary.`;

          // Send the message with the prompt text directly
          await sendMessage(promptText);

          // Signal that errors were sent to trigger clearing
          setDidSendErrors(true);
        } catch (error) {
          console.error('[useSimpleChat] Failed to auto-send error report:', error);
          // Remove from sent errors if there was a failure
          sentErrorsRef.current.delete(errorFingerprint);
        } finally {
          debouncedSendRef.current = null;
        }
      }, 500); // Use consistent 500ms debounce for all errors
    }

    // Cleanup function
    return () => {
      if (debouncedSendRef.current) {
        clearTimeout(debouncedSendRef.current);
        debouncedSendRef.current = null;
      }
    };
  }, [
    immediateErrors,
    isStreaming,
    userMessage,
    sendMessage,
    setDidSendErrors,
    setIsStreaming,
    mergeUserMessage,
  ]);

  // Monitor advisory errors whenever they change (non-critical errors)
  useEffect(() => {
    // Advisories are handled through the system messages mechanism
    // No additional action needed here
  }, [advisoryErrors]);

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
    needsNewKey,
    setNeedsNewKey,
    needsLogin,
    // Error tracking
    immediateErrors,
    advisoryErrors,
    addError,
  };
}
