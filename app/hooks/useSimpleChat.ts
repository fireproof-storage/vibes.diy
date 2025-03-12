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
export function useSimpleChat(sessionId: string | null) {
  // Use our new hooks
  const { session, updateTitle } = useSession(sessionId);
  const { 
    messages, 
    addUserMessage, 
    addAiMessage, 
    updateStreamingMessage,
    isLoading: messagesLoading 
  } = useSessionMessages(sessionId);
  
  // Core state
  const [input, setInput] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [title, setTitle] = useState<string>(session?.title || 'New Chat');
  const [titleGenerated, setTitleGenerated] = useState<boolean>(false);
  
  // Refs for tracking streaming state
  const streamBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiMessageTimestampRef = useRef<number | null>(null);
  const [streamingState, setStreamingState] = useState<boolean>(false);

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

  // Update title when session changes
  useEffect(() => {
    if (session?.title) {
      setTitle(session.title);
    }
  }, [session]);

  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if any AI message is currently streaming - simplified
  const isStreaming = useCallback((): boolean => {
    return streamingState;
  }, [streamingState]);

  // Function to build conversation history for the prompt
  function buildMessageHistory() {
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
    const lastAiMessage = [...messages].reverse().find(
      (msg): msg is AiChatMessage => msg.type === 'ai'
    );
    
    // Return segments from the last AI message or empty array
    return lastAiMessage?.segments || [];
  }, [messages]);

  /**
   * Get the code from the current segments
   * Simplified to avoid streaming-specific logic
   */
  const getCurrentCode = useCallback((): string => {
    const segments = currentSegments();
    const codeSegment = segments.find(segment => segment.type === 'code');
    return codeSegment?.content || '';
  }, [currentSegments]);

  /**
   * Generate a title based on the first two segments (markdown and code)
   * Returns a promise that resolves when the title generation is complete
   */
  async function generateTitle(aiTimestamp: number, segments: Segment[]): Promise<string | null> {
    try {
      // Get first markdown segment and first code segment (if they exist)
      const firstMarkdown = segments.find(seg => seg.type === 'markdown');
      const firstCode = segments.find(seg => seg.type === 'code');
      
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
        setTitle(newTitle);
        
        // Update the session title
        if (sessionId) {
          await updateTitle(newTitle);
          setTitleGenerated(true);
        }
        
        return newTitle;
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }
    
    return null;
  }

  /**
   * Send a message and process the AI response
   * Returns a promise that resolves when the entire process is complete, including title generation
   */
  async function sendMessage(): Promise<void> {
    if (input.trim()) {
      console.log('useSimpleChat: Starting sendMessage with input:', input.substring(0, 30) + '...');
      console.log('useSimpleChat: Current sessionId:', sessionId);
      
      // Reset state for new message
      streamBufferRef.current = '';
      setStreamingState(true);

      try {
        // Add user message
        console.log('useSimpleChat: Adding user message to session');
        await addUserMessage(input);
        
        // Clear input
        setInput('');

        // Build message history
        const messageHistory = buildMessageHistory();
        console.log('useSimpleChat: Message history built, count:', messageHistory.length);

        // Call OpenRouter API with streaming enabled
        console.log('useSimpleChat: Calling OpenRouter API');
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
                  updateStreamingMessage(streamBufferRef.current, aiMessageTimestampRef.current);
                  
                  // Log every 20 characters for debugging
                  if (streamBufferRef.current.length % 20 === 0) {
                    console.log('Stream buffer length:', streamBufferRef.current.length, 
                               'Sample:', streamBufferRef.current.substring(
                                 streamBufferRef.current.length - 20
                               ));
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE JSON:', e);
              }
            }
          }
        }

        // Streaming is done, NOW write the complete AI message to database
        console.log('Finalizing AI message', streamBufferRef.current.substring(0, 50) + '...');
        await addAiMessage(streamBufferRef.current, aiMessageTimestamp, false);
        setStreamingState(false);

        // Generate a title if this is the first response with code
        const { segments } = parseContent(streamBufferRef.current);
        const hasCode = segments.some(segment => segment.type === 'code');
        
        console.log('useSimpleChat: Response has code:', hasCode, 
                   'Session title:', session?.title || 'none');
        
        if (hasCode && (!session?.title || session.title === 'New Chat')) {
          console.log('useSimpleChat: Generating title for session');
          await generateTitle(aiMessageTimestamp, segments);
        }
      } catch (error) {
        // Handle errors
        console.error('Error calling OpenRouter API:', error);
        const errorMessage = 'Sorry, there was an error generating the component. Please try again.';
        // Add error message as AI message
        await addAiMessage(errorMessage);
        setStreamingState(false);
      } finally {
        aiMessageTimestampRef.current = null;
        console.log('useSimpleChat: sendMessage completed');
      }
    }
  }

  // Helper for compatibility with current components
  const setMessages = useCallback((newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    console.warn('setMessages is deprecated. Use addUserMessage and updateAiMessage instead.');
    // This is just a stub for compatibility, we should remove it once components are updated
  }, []);

  return {
    messages,             // All messages in the conversation
    setMessages,          // Function to update messages (legacy, to be removed)
    input,                // Current user input text
    setInput,             // Function to update input
    isStreaming,          // Whether any AI message is currently streaming
    streamingState,       // Direct access to streaming state
    sendMessage,          // Function to send a message
    currentSegments,      // Get current segments
    getCurrentCode,       // Get current code
    inputRef,             // Reference to the input textarea
    messagesEndRef,       // Reference to the messages end div
    autoResizeTextarea,   // Function to resize textarea
    scrollToBottom,       // Function to scroll to bottom
    title,                // Current chat title
    setTitle: updateTitle,// Function to update title
    titleGenerated,
    sessionId,
    isLoadingMessages: messagesLoading
  };
} 