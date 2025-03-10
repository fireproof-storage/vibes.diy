import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatMessage } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';
import { RegexParser } from '../../RegexParser';

const CHOSEN_MODEL = 'anthropic/claude-3.7-sonnet';
// const CHOSEN_MODEL = 'qwen/qwq-32b:free';

export function useChat(
  onCodeGenerated: (code: string, dependencies?: Record<string, string>) => void,
  onGeneratedTitle?: (title: string) => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStreamedText, setCurrentStreamedText] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [streamingCode, setStreamingCode] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [completedCode, setCompletedCode] = useState<string>('');
  const [completedMessage, setCompletedMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parserState = useRef<RegexParser>(new RegexParser());
  // Add a ref to store the raw stream data for debugging
  const rawStreamBuffer = useRef<string>('');

  // Initialize parser when the component mounts
  useEffect(() => {
    if (!parserState.current) {
      parserState.current = new RegexParser();
    }
  }, []);

  // Add debug logging whenever messages change, but with a more descriptive context
  useEffect(() => {
    // Only log when there's actually a meaningful change, not on initial render
    if (messages.length > 0) {
      console.log('useChat: Messages updated:', messages.length, messages);
    }
  }, [messages]);

  // Initialize system prompt
  useEffect(() => {
    makeBaseSystemPrompt(CHOSEN_MODEL).then((prompt) => {
      setSystemPrompt(prompt);
    });
  }, []);

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

  // Create a wrapped setMessages function that includes logging
  const setMessagesWithLogging = useCallback((newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    // Only log when there's an actual change
    if (typeof newMessages === 'function') {
      console.log('useChat: setMessages called with: function updater');
      setMessages((prev) => {
        const result = (newMessages as Function)(prev);
        // Only update if the result is actually different
        if (JSON.stringify(result) !== JSON.stringify(prev)) {
          return result;
        }
        return prev;
      });
    } else {
      // Only update if the new messages are different
      setMessages((prev) => {
        if (JSON.stringify(newMessages) !== JSON.stringify(prev)) {
          console.log('useChat: setMessages called with:', `array of ${Array.isArray(newMessages) ? newMessages.length : 'unknown'} messages`);
          return newMessages;
        }
        return prev;
      });
    }
  }, []);

  // Function to build conversation history for the prompt
  function buildMessageHistory() {
    return messages.map((msg) => ({
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content:
        msg.type === 'user'
          ? msg.text
          : `${msg.text}${
              msg.code ? `\n\nHere's the code I generated:\n\`\`\`jsx\n${msg.code}\n\`\`\`` : ''
            }${
              msg.dependencies && Object.keys(msg.dependencies).length > 0
                ? `\n\nWith dependencies:\n${JSON.stringify(msg.dependencies, null, 2)}`
                : ''
            }`,
    }));
  }

  // Initialize parser with event listeners
  const initParser = useCallback(() => {
    // Reset the parser state
    parserState.current.reset();
    
    // Add event listeners
    parserState.current.on('text', (textChunk: string, fullText: string) => {
      console.log('Text event received:', textChunk.substring(0, 50) + '...');
      setCurrentStreamedText(fullText); // Update with the full displayText from parser
    });
    
    parserState.current.on('code', (code: string, language: string) => {
      console.log('Code received, language:', language, 'length:', code.length);
      setCompletedCode(code);
    });
    
    parserState.current.on('codeUpdate', (code: string) => {
      // Only update streamingCode for significant changes to reduce re-renders
      if (Math.abs(code.length - streamingCode.length) > 5) {
        setStreamingCode(code);
      }
    });

    parserState.current.on('dependencies', (dependencies: Record<string, string>) => {
      console.log('Dependencies detected:', dependencies);
    });

    return parserState.current;
  }, [streamingCode]);

  async function sendMessage() {
    if (input.trim()) {
      // Reset state for new message
      setCurrentStreamedText('');
      setStreamingCode('');
      setCompletedCode('');
      setIsStreaming(true);
      setIsGenerating(true);
      // Reset the raw stream buffer
      rawStreamBuffer.current = '';

      // Add user message
      setMessages((prev) => [...prev, { text: input, type: 'user' }]);
      setInput('');

      // Initialize parser
      const parser = initParser();

      // Track if we've already added the "Writing code..." message
      let writingCodeMessageAdded = false;

      try {
        // Build message history
        const messageHistory = buildMessageHistory();

        // Call OpenRouter API with streaming enabled
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
            stream: true, // Enable streaming
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

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Process each line (each SSE event)
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices && data.choices[0]?.delta?.content) {
                  const content = data.choices[0].delta.content;

                  // Capture raw stream data for debugging
                  rawStreamBuffer.current += content;

                  // Feed the chunk to our parser
                  parser.write(content);

                  // Direct check for code block markers
                  if (!writingCodeMessageAdded && content.includes('```')) {
                    setCurrentStreamedText((prevText) => {
                      const updatedText = prevText + '\n\n> Writing code...\n\n';
                      return updatedText;
                    });
                    writingCodeMessageAdded = true;
                  }

                  // Also update streaming code directly from parser's current state
                  if (parser.inCodeBlock) {
                    setStreamingCode(parser.codeBlockContent);
                  }
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }

        // End the parser stream
        parser.end();

        console.log('rawStreamBuffer.current', rawStreamBuffer.current);
        console.log('parser.displayText', parser.displayText);

        // Clean up the message text - use parser's displayText instead of currentStreamedText
        let cleanedMessage = parser.displayText || currentStreamedText;

        // Clean up any extra whitespace at the beginning
        cleanedMessage = cleanedMessage.trimStart();

        // Additional cleanup for any JSON artifacts
        cleanedMessage = cleanedMessage
          .replace(/^\s*{"dependencies":.*?}}\s*/i, '')  // Remove JSON blocks
          .replace(/^\s*:""[}\s]*/i, '')  // Remove artifacts
          .replace(/^\s*""\s*:\s*""[}\s]*/i, '')  // Remove artifacts
          .trim();

        console.log('cleanedMessage', cleanedMessage);

        // If cleanedMessage is still empty but we have code, add a default message
        if (!cleanedMessage && parser.codeBlockContent) {
          cleanedMessage = "Here's your code:";
        }

        // Add AI response with code and dependencies
        setMessages((prev) => [
          ...prev,
          {
            text: cleanedMessage,
            type: 'ai',
            code: parser.codeBlockContent,
            dependencies: parser.dependencies,
          },
        ]);

        // Store the completed message
        setCompletedMessage(cleanedMessage);

        // Execute callback with generated code if available
        if (parser.codeBlockContent) {
          onCodeGenerated(parser.codeBlockContent, parser.dependencies);
        }

        // Generate a title from the final response
        if (onGeneratedTitle) {
          try {
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
                    content: `Generate a short, descriptive title (3-5 words) for this app, use the React JSX <h1> tag's value if you can find it:\n\n${rawStreamBuffer.current}`,
                  },
                ],
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const title = data.choices[0]?.message?.content?.trim() || 'New Chat';
              console.log('Generated title:', title, cleanedMessage);
              onGeneratedTitle(title);
            } else {
              onGeneratedTitle('New Chat');
            }
          } catch (error) {
            console.error('Error generating title:', error);
            onGeneratedTitle('New Chat');
          }
        }

        // Add this before setting the final message
        console.log('Debug values:', {
          currentStreamedText,
          cleanedMessage,
          parser,
        });

        // Add this debug log to confirm parser state
        console.log('Parser state at stream end:', parser);

        // Use parser's displayText property instead of the non-existent fullResponseBuffer
        const finalMessage =
          parser.displayText.trim() ||
          cleanedMessage ||
          currentStreamedText ||
          "Here's your generated app:";
        setCompletedMessage(finalMessage);

        // Update the messages array with more efficient update check
        setMessagesWithLogging((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const lastMessageIndex = updatedMessages.length - 1;

          if (lastMessageIndex >= 0) {
            // Only update if there's an actual change
            const currentLastMessage = updatedMessages[lastMessageIndex];
            const newLastMessage = {
              ...currentLastMessage,
              text: finalMessage,
              streaming: false,
              completed: true,
            };
            
            // Check if the update would actually change anything
            if (
              currentLastMessage.text !== newLastMessage.text ||
              currentLastMessage.streaming !== newLastMessage.streaming ||
              currentLastMessage.completed !== newLastMessage.completed
            ) {
              updatedMessages[lastMessageIndex] = newLastMessage;
              return updatedMessages;
            }
          }

          // Return unchanged if no modifications needed
          return prevMessages;
        });
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            text: 'Sorry, there was an error generating the component. Please try again.',
            type: 'ai',
          },
        ]);
        console.error('Error calling OpenRouter API:', error);
      } finally {
        setIsGenerating(false);
        setIsStreaming(false);
      }
    }
  }

  return {
    messages,
    setMessages: setMessagesWithLogging,
    input,
    setInput,
    isGenerating,
    currentStreamedText,
    streamingCode,
    completedCode,
    isStreaming,
    inputRef,
    messagesEndRef,
    autoResizeTextarea,
    scrollToBottom,
    sendMessage,
    parserState,
    completedMessage,
  };
}
