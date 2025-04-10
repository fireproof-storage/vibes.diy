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
  const { apiKey } = useApiKey(userId);

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
  const [needsNewKey, setNeedsNewKey] = useState<boolean>(false);

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
          // Check for various error cases including empty responses and different error formats
          console.log('Final content type:', typeof finalContent);
          console.log('Final content length:', finalContent ? finalContent.length : 0);
          
          // Empty response detection - a sign of possible API issues
          if (!finalContent || (typeof finalContent === 'string' && finalContent.trim().length === 0)) {
            console.log('Empty response detected - possible API error');
            
            // We should check credits to see if this is a credit issue
            if (apiKey) {
              console.log('Checking credits to determine if this is a credit issue');
              try {
                const credits = await getCredits(apiKey);
                if (credits && credits.available <= 0) {
                  console.log('No credits available - need new key');
                  setNeedsNewKey(true);
                  return;
                } else {
                  console.log('Credits available but got empty response - likely rate limiting or other API error');
                  // We'll use a default message instead of empty response
                  finalContent = 'Sorry, there was an error processing your request. Please try again in a moment.';
                }
              } catch (creditError) {
                console.error('Error checking credits:', creditError);
                // Default message for error case
                finalContent = 'Unable to process request. Please try again later.';
              }
            }
          }
          
          // For debugging - show first/last part of content if it's long
          if (typeof finalContent === 'string' && finalContent.length > 100) {
            console.log('Content preview:', 
              finalContent.substring(0, 50) + '...' + 
              finalContent.substring(finalContent.length - 50)
            );
          } else {
            console.log('Full content:', finalContent);
          }
          
          // If it's a string that looks like JSON, try parsing it for error detection
          if (typeof finalContent === 'string' && finalContent.trim()) {
            const trimmed = finalContent.trim();
            // Only try to parse if it starts with { or [
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                const parsedContent = JSON.parse(trimmed);
                console.log('Successfully parsed JSON');
                
                // Check for different error formats
                
                // 1. OpenRouter format with user_id
                if (parsedContent.error && parsedContent.user_id) {
                  console.log('OpenRouter error format detected:', parsedContent.error);
                  
                  if (parsedContent.error.code === 402 || 
                      (parsedContent.error.message && 
                       parsedContent.error.message.includes('requires more credits'))) {
                    console.log('Credit limit error - need new key');
                    setNeedsNewKey(true);
                    return;
                  }
                }
                // 2. CallAI format (according to docs)
                else if (parsedContent.error && parsedContent.message) {
                  console.log('CallAI error format detected:', parsedContent);
                  
                  // Check for credit-related issues in message
                  if (parsedContent.message.includes('credit') || 
                      parsedContent.message.includes('quota') ||
                      parsedContent.message.includes('limit')) {
                    console.log('Credit/quota limit error detected in message');
                    setNeedsNewKey(true);
                    return;
                  }
                }
                // 3. Direct error object
                else if (parsedContent.code === 402 || 
                         (parsedContent.message && 
                          (parsedContent.message.includes('credit') || 
                           parsedContent.message.includes('quota') || 
                           parsedContent.message.includes('limit')))) {
                  console.log('Direct error object detected:', parsedContent);
                  console.log('Credit/quota limit error detected');
                  setNeedsNewKey(true);
                  return;
                }
              } catch (e) {
                // Add details about what failed to parse for debugging
                console.log('JSON parse error:', e);
                console.log('Content that failed to parse:', trimmed.length > 100 ? 
                  trimmed.substring(0, 50) + '...' + trimmed.substring(trimmed.length - 50) : 
                  trimmed
                );
              }
            } else {
              // Not JSON format (doesn't start with { or [)
              console.log('Content doesn\'t look like JSON:', 
                trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed
              );
            }
          } else if (!finalContent) {
            console.log('Content is empty or undefined');
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
      .catch((error) => {
        console.error('Error processing stream:', error);
        
        // Check for our special credit limit error thrown by streamAI
        if (error.message && error.message.startsWith('CREDIT_LIMIT_ERROR:')) {
          console.log('Credit limit error caught from streamAI');
          setNeedsNewKey(true);
        }
        
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

  // Check credits whenever we get an API key
  useEffect(() => {
    if (apiKey) {
      console.log('API key available, checking credits...');
      getCredits(apiKey)
        .then((credits: { available: number; usage: number; limit: number }) => {
          console.log('Initial credits check:', credits);
        })
        .catch((error: Error) => {
          console.error('Failed to fetch initial credits:', error);
        });
    }
  }, [apiKey]);

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
  };
}
