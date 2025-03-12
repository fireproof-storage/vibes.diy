import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatMessage, Segment } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import { useSession } from './useSession';
import { useSessionMessages } from './useSessionMessages';
import { generateTitle } from '../utils/titleGenerator';
import { processStream, updateStreamingMessage } from '../utils/streamHandler';

const CHOSEN_MODEL = 'anthropic/claude-3.7-sonnet';

/**
 * Simplified chat hook that focuses on data-driven state management
 * Uses session-based architecture with individual message documents
 */
export function useSimpleChat(sessionId: string | undefined) {
  // Use our new hooks
  const { session, updateTitle, addUserMessage, docs, updateStreamingMessage: updateStreamingMessageFromSession } = useSession(sessionId);
  const { messages, isLoading: isLoadingMessages, addAiMessage } = useSessionMessages(session?._id);

  // Core state
  const [input, setInput] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Refs for tracking streaming state
  const streamBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Initialize system prompt
  useEffect(() => {
    // Check if we're in a test environment
    if (import.meta.env.MODE === 'test') {
      setSystemPrompt('Test system prompt');
    } else {
      makeBaseSystemPrompt(CHOSEN_MODEL).then((prompt) => {
        setSystemPrompt(prompt);
      });
    }
  }, []);

  // Function to build conversation history for the prompt
  function buildMessageHistory() {
    // todo is this format correct?
    return messages.map((msg) => ({
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text,
    }));
  }

  /**
   * Get current segments from the last AI message or the streaming buffer
   * Simplified to always return segments, regardless of streaming state
   */
  const currentSegments = useCallback((): Segment[] => {
    // If we have content in the streaming buffer, use it
    if (streamBufferRef.current.length > 0) {
      const { segments } = parseContent(streamBufferRef.current);
      return segments;
    }

    // Otherwise find the last AI message
    const lastAiMessage = [...messages]
      .reverse()
      .find((msg) => msg.type === 'ai');

    // Return segments from the last AI message or empty array
    return lastAiMessage?.segments || [];
  }, [messages]);

  /**
   * Get the code from the current segments
   * Simplified to avoid streaming-specific logic
   */
  const getCurrentCode = useCallback((): string => {
    const segments = currentSegments();
    const codeSegment = segments.find((segment) => segment.type === 'code');
    return codeSegment?.content || '';
  }, [currentSegments]);

  // Near the top of the file, add a debug logging function
  function logDebug(message: string) {
    console.debug(`🔍 SIMPLE_CHAT: ${message}`);
  }

  /**
   * Send a message and process the AI response
   * Returns a promise that resolves when the entire process is complete, including title generation
   */
  async function sendMessage(): Promise<void> {
    if (input.trim()) {
      logDebug(`Starting sendMessage with input: ${input.substring(0, 30)}...`);
      logDebug(`Current sessionId: ${sessionId}`);

      // Reset state for new message
      streamBufferRef.current = '';
      setIsStreaming(true);

      try {
        // Add user message
        logDebug('Adding user message to session');
        await addUserMessage(input);

        // Clear input
        setInput('');

        // Build message history
        const messageHistory = buildMessageHistory();
        logDebug(`Message history built, count: ${messageHistory.length}`);

        // Call OpenRouter API with streaming enabled
        logDebug('Calling OpenRouter API');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Fireproof App Builder',
          },
          body: JSON.stringify({
            model: CHOSEN_MODEL,
            stream: true,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              ...messageHistory,
              {
                role: 'user',
                content: input,
              },
            ],
          }),
        });

        // Process the stream using our new utility
        await processStream(
          response,
          // On each chunk, update the buffer and process the message
          (content) => {
            streamBufferRef.current += content;
            updateStreamingMessage(
              streamBufferRef.current, 
              addAiMessage,
              messages
            );
          },
          // On complete, finalize the message
          async () => {
            // Streaming is done, write the complete AI message to database
            logDebug(`Finalizing AI message (${streamBufferRef.current.length} chars)`);
            await addAiMessage(streamBufferRef.current, Date.now(), false);
            setIsStreaming(false);

            // Generate a title if this is the first response with code
            const { segments } = parseContent(streamBufferRef.current);
            const hasCode = segments.some((segment) => segment.type === 'code');

            logDebug(`Response has code: ${hasCode}, Session title: ${session?.title || 'none'}`);

            if (hasCode && (!session?.title || session.title === 'New Chat')) {
              logDebug('Generating title for session');
              await generateTitle(segments, CHOSEN_MODEL, updateTitle);
            }
          },
          // On error, handle it
          (error) => {
            console.error('Error calling OpenRouter API:', error);
            const errorMessage =
              'Sorry, there was an error generating the component. Please try again.';
            // Add error message as AI message
            addAiMessage(errorMessage);
            setIsStreaming(false);
          }
        );
      } catch (error) {
        // Handle errors
        console.error('Error in sendMessage:', error);
        const errorMessage =
          'Sorry, there was an error generating the component. Please try again.';
        // Add error message as AI message
        await addAiMessage(errorMessage);
        setIsStreaming(false);
      } finally {
        logDebug('sendMessage completed');
      }
    }
  }

  // Helper for compatibility with current components
  const setMessages = useCallback(
    (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      console.warn('setMessages is deprecated. Use addUserMessage and updateAiMessage instead.');
      // This is just a stub for compatibility, we should remove it once components are updated
    },
    []
  );

  // Helper for parsing dependencies from message content
  const getDependencies = useCallback((): Record<string, string> => {
    const { dependenciesString } = parseContent(streamBufferRef.current);
    return parseDependencies(dependenciesString);
  }, []);

  return {
    messages,
    getDependencies,
    setMessages, // Function to update messages (legacy, to be removed)

    input, // Current user input text
    setInput, // Function to update input

    isStreaming, // Whether any AI message is currently streaming
    sendMessage, // Function to send a message
    currentSegments, // Get current segments
    getCurrentCode, // Get current code
    inputRef, // Reference to the input textarea

    title: session?.title || 'New Chat', // Current chat title

    sessionId,
    isLoadingMessages,
  };
}
