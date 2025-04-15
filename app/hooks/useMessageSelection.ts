import { useMemo, useCallback } from 'react';
import type { Segment, ChatMessageDocument } from '../types/chat';
import { parseContent, parseDependencies } from '../utils/segmentParser';

/**
 * Hook for managing message selection and content processing
 * @param options - Configuration options including docs, streaming state, and messages
 * @returns Object with selected message data and utility functions
 */
export function useMessageSelection({
  docs,
  isStreaming,
  aiMessage,
  selectedResponseId,
  pendingAiMessage,
}: {
  docs: any[];
  isStreaming: boolean;
  aiMessage: ChatMessageDocument;
  selectedResponseId: string;
  pendingAiMessage: ChatMessageDocument | null;
}) {
  // The list of messages for the UI: docs + streaming message if active
  const messages = useMemo(() => {
    const baseDocs = docs.filter(
      (doc: any) => doc.type === 'ai' || doc.type === 'user' || doc.type === 'system'
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
    }

    // Priority 2: Pending message (if no valid user selection)
    if (pendingAiMessage) {
      return pendingAiMessage;
    }

    // Priority 3: Streaming message (if no valid user selection and not pending)
    if (isStreaming) {
      return aiMessage;
    }

    // Priority 4: Default to latest AI message from docs
    const latestAiDoc = docs.filter((doc: any) => doc.type === 'ai').reverse()[0];
    return latestAiDoc;
  }, [selectedResponseId, docs, pendingAiMessage, isStreaming, aiMessage]) as
    | ChatMessageDocument
    | undefined;

  // Process selected response into segments and code
  const { selectedSegments, selectedCode, selectedDependencies } = useMemo(() => {
    const { segments, dependenciesString } = selectedResponseDoc
      ? parseContent(selectedResponseDoc.text)
      : { segments: [], dependenciesString: '' };

    // First try to find code in the currently selected message
    let code = segments.find((segment) => segment.type === 'code');

    // If no code was found and we have a valid selectedResponseDoc, look through all AI messages
    if (!code && selectedResponseDoc) {
      // Get all AI messages sorted from newest to oldest
      const aiMessages = docs
        .filter((doc: any) => doc.type === 'ai')
        .sort((a: any, b: any) => b.created_at - a.created_at);

      // Look through each AI message until we find code
      for (const message of aiMessages) {
        // Skip the current message as we already checked it
        if (message._id === selectedResponseDoc._id) continue;

        const { segments: msgSegments } = parseContent(message.text);
        code = msgSegments.find((segment) => segment.type === 'code');
        if (code) break; // Stop once we find code
      }
    }

    // Default empty segment if no code was found anywhere
    if (!code) code = { content: '' } as Segment;

    const dependencies = dependenciesString ? parseDependencies(dependenciesString) : {};

    return {
      selectedSegments: segments,
      selectedCode: code,
      selectedDependencies: dependencies,
    };
  }, [selectedResponseDoc, docs]);

  // Build message history for AI requests
  const filteredDocs = docs.filter(
    (doc: any) => doc.type === 'ai' || doc.type === 'user' || doc.type === 'system'
  );
  const buildMessageHistory = useCallback((): Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }> => {
    return filteredDocs.map((msg: any) => {
      const role =
        msg.type === 'user'
          ? ('user' as const)
          : msg.type === 'system'
            ? ('system' as const)
            : ('assistant' as const);
      return {
        role,
        content: msg.text || '',
      };
    });
  }, [filteredDocs]);

  return {
    messages,
    selectedResponseDoc,
    selectedSegments,
    selectedCode,
    selectedDependencies,
    buildMessageHistory,
  };
}
