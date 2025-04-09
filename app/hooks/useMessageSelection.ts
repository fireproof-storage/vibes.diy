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
      (doc: any) => doc.type === 'ai' || doc.type === 'user'
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

    const code =
      segments.find((segment) => segment.type === 'code') || ({ content: '' } as Segment);

    const dependencies = dependenciesString ? parseDependencies(dependenciesString) : {};

    return {
      selectedSegments: segments,
      selectedCode: code,
      selectedDependencies: dependencies,
    };
  }, [selectedResponseDoc]);

  // Build message history for AI requests
  const filteredDocs = docs.filter((doc: any) => doc.type === 'ai' || doc.type === 'user');
  const buildMessageHistory = useCallback(() => {
    return filteredDocs.map((msg: any) => ({
      role: msg.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text || '',
    }));
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
