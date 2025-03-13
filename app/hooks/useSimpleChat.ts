import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Segment, ChatMessageDocument, ChatState } from '../types/chat';
import { makeBaseSystemPrompt } from '../prompts';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import { useSession } from './useSession';
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
  const {
    session,
    updateTitle,
    docs,
    userMessage,
    mergeUserMessage,
    submitUserMessage,
    mergeAiMessage,
    saveAiMessage,
    database,
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

  // Process docs into messages for the UI
  const filteredDocs = docs.filter((doc: any) => doc.type === 'ai' || doc.type === 'user');

  const messages = (aiMessage.text.length > 0
    ? [...filteredDocs, aiMessage]
    : filteredDocs) as unknown as ChatMessageDocument[];

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

    // First, ensure we have the system prompt
    // Instead of setting state and immediately using it, get the value and use it directly
    let currentSystemPrompt = systemPrompt;
    if (!currentSystemPrompt) {
      if (import.meta.env.MODE === 'test') {
        currentSystemPrompt = 'Test system prompt';
        setSystemPrompt(currentSystemPrompt);
      } else {
        currentSystemPrompt = await makeBaseSystemPrompt(CODING_MODEL);
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
          streamBufferRef.current += content;
          console.log('>', streamBufferRef.current.length);
          mergeAiMessage({ text: streamBufferRef.current });
        });
      })
      .then(async () => {
        console.log('saving final message', streamBufferRef.current.length);
        aiMessage.text = streamBufferRef.current;
        // mergeAiMessage({ text: streamBufferRef.current });
        console.log('ai message', aiMessage);
        const ok = await database.put(aiMessage);
        console.log('ok', ok);
      })
      .then(() => {
        console.log('generating title', aiMessage.text.length);
        const { segments } = parseContent(aiMessage.text);
        if (!session?.title) {
          return generateTitle(segments, TITLE_MODEL).then(updateTitle);
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
    sessionId: session._id,
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
    title: session?.title || '',
  };
}
