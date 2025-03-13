import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Segment, ChatMessageDocument } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import { useSession } from './useSession';
import { generateTitle } from '../utils/titleGenerator';
import { processStream, callOpenRouterAPI } from '../utils/streamHandler';

const CHOSEN_MODEL = 'anthropic/claude-3.7-sonnet';

/**
 * Simplified chat hook that focuses on data-driven state management
 * Uses session-based architecture with individual message documents
 */
export function useSimpleChat(sessionId: string | undefined) {
  const {
    session,
    updateTitle,
    docs,
    userMessage,
    mergeUserMessage,
    submitUserMessage,
    mergeAiMessage,
    submitAiMessage,
    aiMessage,
  } = useSession(sessionId);
  // const [input, setInput] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const streamBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string>(''); // default most recent

  const selectedResponseDoc = (isStreaming
    ? aiMessage
    : docs.find((doc: any) => doc.type === 'ai' && doc._id === selectedResponseId) ||
      docs.find((doc: any) => doc.type === 'ai')) as unknown as ChatMessageDocument;

  function setInput(input: string) {
    // is this is wrong I dont want to be right
    mergeUserMessage({ text: input });
  }

  // Initialize system prompt - only called when needed

  // Process docs into messages for the UI
  const messages = docs.filter(
    (doc: any) => doc.type === 'ai' || doc.type === 'user'
  ) as unknown as ChatMessageDocument[];

  function buildMessageHistory() {
    return messages.map((msg) => ({
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text || '',
    }));
  }

  const { segments: selectedSegments, dependenciesString: selectedDependenciesString } =
    selectedResponseDoc
      ? parseContent(selectedResponseDoc.text)
      : { segments: [], dependenciesString: '' };

  const selectedCode =
    selectedSegments.find((segment) => segment.type === 'code') || ({ content: '' } as Segment);

  const selectedDependencies = selectedDependenciesString
    ? parseDependencies(selectedDependenciesString)
    : {};
  /**
   * Send a message and process the AI response
   * Returns a promise that resolves when the entire process is complete, including title generation
   */
  async function sendMessage(): Promise<void> {
    if (!userMessage.text.trim()) return;

    // Check if systemPrompt is empty instead of using a boolean flag
    if (!systemPrompt) {
      if (import.meta.env.MODE === 'test') {
        setSystemPrompt('Test system prompt');
      } else {
        const prompt = await makeBaseSystemPrompt(CHOSEN_MODEL);
        setSystemPrompt(prompt);
      }
    }

    streamBufferRef.current = '';
    setIsStreaming(true);

    await submitUserMessage();

    const messageHistory = buildMessageHistory();

    return callOpenRouterAPI(CHOSEN_MODEL, systemPrompt, messageHistory, userMessage.text)
      .then((response) =>
        processStream(response, (content) => {
          streamBufferRef.current += content;
          mergeAiMessage({ text: streamBufferRef.current });
        })
      )
      .then(() => {
        if (!aiMessage.text) {
          console.error('No AI message text found');
          return;
        }
        // This code runs after streaming is complete
        submitAiMessage();
        const { segments } = parseContent(aiMessage.text);
        if (!session?.title) {
          return generateTitle(segments, CHOSEN_MODEL).then(updateTitle);
        }
      })
      .catch((error) => {
        console.error('Error processing stream:', error);
      })
      .finally(() => {
        setIsStreaming(false);
      });
  }

  return {
    sessionId,
    docs: messages,
    selectedResponseDoc,
    selectedSegments,
    selectedCode,
    selectedDependencies,
    input: userMessage.text,
    setInput,
    isStreaming,
    sendMessage,
    inputRef,
    title: session?.title || 'New Chat',
  };
}
