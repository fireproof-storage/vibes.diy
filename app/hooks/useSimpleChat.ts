import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatMessage, UserChatMessage, AiChatMessage, Segment } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import { useSession } from './useSession';
import { useSessionMessages } from './useSessionMessages';

const CHOSEN_MODEL = 'anthropic/claude-3.7-sonnet';

/**
 * Simplified chat hook that focuses on data-driven state management
 * Uses session-based architecture with individual message documents
 */
export function useSimpleChat(sessionId: string | undefined) {
  // Use our new hooks
  const { session, updateTitle, addUserMessage, docs, updateStreamingMessage } = useSession(sessionId);
  

  // Core state
  const [input, setInput] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Refs for tracking streaming state
  const streamBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aiMessageTimestampRef = useRef<number | null>(null);
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
  // const currentSegments = useCallback((): Segment[] => {
  //   // If we have content in the streaming buffer, use it
  //   if (streamBufferRef.current.length > 0) {
  //     const { segments } = parseContent(streamBufferRef.current);
  //     return segments;
  //   }

  //   // Otherwise find the last AI message
  //   const lastAiMessage = [...messages]
  //     .reverse()
  //     .find((msg): msg is AiChatMessage => msg.type === 'ai');

  //   // Return segments from the last AI message or empty array
  //   return lastAiMessage?.segments || [];
  // }, [messages]);

  /**
   * Get the code from the current segments
   * Simplified to avoid streaming-specific logic
   */
  // const getCurrentCode = useCallback((): string => {
  //   const segments = currentSegments();
  //   const codeSegment = segments.find((segment) => segment.type === 'code');
  //   return codeSegment?.content || '';
  // }, [currentSegments]);


  // const getDependencies = useCallback((): Record<string, string> => {
  //   const { dependenciesString } = parseContent(streamBufferRef.current);
  //   return parseDependencies(dependenciesString);
  // }, [currentSegments]);

  /**
   * Generate a title based on the first two segments (markdown and code)
   * Returns a promise that resolves when the title generation is complete
   */
  async function generateTitle(segments: Segment[]): Promise<string | null> {
    try {
      // Get first markdown segment and first code segment (if they exist)
      const firstMarkdown = segments.find((seg) => seg.type === 'markdown');
      const firstCode = segments.find((seg) => seg.type === 'code');

      // Create content from the first two segments
      let titleContent = '';

      if (firstMarkdown) {
        titleContent += firstMarkdown.content + '\n\n';
      }

      if (firstCode) {
        titleContent += '```\n' + firstCode.content.split('\n').slice(0, 15).join('\n') + '\n```';
      }

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
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that generates short, descriptive titles. Create a concise title (3-5 words) that captures the essence of the content. Return only the title, no other text or markup.',
            },
            {
              role: 'user',
              content: `Generate a short, descriptive title (3-5 words) for this app, use the React JSX <h1> tag's value if you can find it:\n\n${titleContent}`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newTitle = data.choices[0]?.message?.content?.trim() || 'New Chat';
        await updateTitle(newTitle);
        return newTitle;
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }

    return null;
  }

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

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();

        // Create a timestamp for this AI message - we'll use it when storing the final message
        const aiMessageTimestamp = Date.now();
        aiMessageTimestampRef.current = aiMessageTimestamp;

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Process SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            // Skip OpenRouter processing messages
            if (line.startsWith(': OPENROUTER PROCESSING')) {
              continue;
            }

            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices && data.choices[0]?.delta?.content) {
                  const content = data.choices[0].delta.content;
                  // Add only the actual content to the buffer
                  streamBufferRef.current += content;

                  // IMPROVED IMPLEMENTATION: Update streaming message in memory only
                  // This avoids database writes during streaming
                  console.debug(
                    `🔍 STREAM CONTENT UPDATE: length=${streamBufferRef.current.length}`
                  );
                  updateStreamingMessageImplementation(
                    streamBufferRef.current,
                    aiMessageTimestampRef.current
                  );

                  // No need for log every 20 characters - removed for cleaner logs
                }
              } catch (e) {
                console.error('Error parsing SSE JSON:', e);
              }
            }
          }
        }

        // Streaming is done, NOW write the complete AI message to database
        logDebug(`Finalizing AI message (${streamBufferRef.current.length} chars)`);
        await addAiMessage(streamBufferRef.current, aiMessageTimestamp, false);
        setIsStreaming(false);

        // Generate a title if this is the first response with code
        const { segments } = parseContent(streamBufferRef.current);
        const hasCode = segments.some((segment) => segment.type === 'code');

        logDebug(`Response has code: ${hasCode}, Session title: ${session?.title || 'none'}`);

        if (hasCode && (!session?.title || session.title === 'New Chat')) {
          logDebug('Generating title for session');
          await generateTitle(aiMessageTimestamp, segments);
        }
      } catch (error) {
        // Handle errors
        console.error('Error calling OpenRouter API:', error);
        const errorMessage =
          'Sorry, there was an error generating the component. Please try again.';
        // Add error message as AI message
        await addAiMessage(errorMessage);
        setIsStreaming(false);
      } finally {
        aiMessageTimestampRef.current = null;
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

  // Function used by the API stream handler to update streaming message
  function updateStreamingMessageImplementation(rawMessage: string, timestamp: number) {
    console.debug(`🔍 UPDATE_STREAMING: length=${rawMessage.length} timestamp=${timestamp}`);

    // Only process messages with actual content
    if (!rawMessage || rawMessage.trim().length === 0) {
      console.debug('🔍 EMPTY MESSAGE: Skipping empty streaming update');
      return;
    }

    // Ensure we properly parse content into segments
    const { segments, dependenciesString } = parseContent(rawMessage);

    // Log what segments we parsed
    console.debug(`🔍 PARSED ${segments.length} SEGMENTS for streaming message`);

    // Enhanced logging for debugging
    if (segments.length > 0) {
      segments.forEach((segment, i) => {
        console.debug(`  Segment ${i}: type=${segment.type}, length=${segment.content.length}`);
        // Add sample of content for debugging
        console.debug(`  Sample: "${segment.content.substring(0, Math.min(30, segment.content.length))}..."`);
      });
    }

    // CRITICAL FIX: Always create a simple markdown segment with the full content 
    // if no segments were parsed. This ensures content is shown immediately.
    if (segments.length === 0 && rawMessage.trim().length > 0) {
      segments.push({
        type: 'markdown',
        content: rawMessage,
      });
      console.debug('🔍 CREATED FALLBACK MARKDOWN SEGMENT from raw message text');
    }

    // Use addAiMessage with isStreaming=true to update in-memory message
    addAiMessage(rawMessage, timestamp, true).catch(console.error);

    // After parsing segments, add logging about state updates
    logDebug(`Setting ${segments.length} segments to message state`);
    logDebug(`Current messages count: ${messages.length}`);

    // In any function that updates messages state, add:
    logDebug(`Updating messages state with ${messages.length} messages`);
    messages.forEach((msg, i) => {
      if (msg.type === 'ai') {
        const aiMsg = msg as AiChatMessage;
        logDebug(`  Message ${i}: type=${msg.type}, isStreaming=${aiMsg.isStreaming}, segments=${aiMsg.segments?.length || 0}, text length=${msg.text?.length || 0}`);
      } else {
        logDebug(`  Message ${i}: type=${msg.type}, text length=${msg.text?.length || 0}`);
      }
    });
  }

  return {
    // messages, // All messages in the conversation
    // dependenciesString,
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
    // isLoadingMessages: messagesLoading,
    // updateStreamingMessage, // Directly expose the imported function
  };
}
