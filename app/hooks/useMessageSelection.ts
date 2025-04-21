import { useMemo, useCallback, useState, useEffect } from 'react';
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
  // Also include the last message that was streaming even after streaming ends
  // This prevents temporarily losing the message during the transition
  const [prevStreamingMessage, setPrevStreamingMessage] = useState<ChatMessageDocument | null>(
    null
  );

  // When streaming and we have text, capture the streaming message
  useEffect(() => {
    if (isStreaming && aiMessage.text.length > 0) {
      setPrevStreamingMessage(aiMessage);
    }
  }, [isStreaming, aiMessage.text]);

  const messages = useMemo(() => {
    // First filter the docs to get messages we want to display
    const baseDocs = docs.filter(
      (doc: any) => doc.type === 'ai' || doc.type === 'user' || doc.type === 'system'
    ) as unknown as ChatMessageDocument[];

    // If currently streaming, include the streaming message
    if (isStreaming && aiMessage.text.length > 0) {
      return [...baseDocs, aiMessage];
    }

    // When streaming just ended, check if the last message is in docs
    if (!isStreaming && prevStreamingMessage) {
      // Look for the message ID in the docs to see if it's been saved
      const messageInDocs = baseDocs.some(
        (doc) => prevStreamingMessage._id && doc._id === prevStreamingMessage._id
      );

      // If the message has been saved to the database, no need to append it
      if (messageInDocs) {
        return baseDocs;
      }

      // Otherwise keep showing the message until it appears in the database
      // This prevents the chat from temporarily resetting during the transition
      return [...baseDocs, prevStreamingMessage];
    }

    // Default case - just use the messages from the database
    return baseDocs;
  }, [docs, isStreaming, aiMessage, prevStreamingMessage]);

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

    // Priority 4: Default to latest AI message from docs that contains code
    const aiDocs = docs.filter((doc: any) => doc.type === 'ai');
    // Find the most recent doc that contains code when parsed
    const latestAiDocWithCode = aiDocs
      .filter((doc) => {
        const { segments } = parseContent(doc.text);
        return segments.some((s: Segment) => s.type === 'code');
      })
      .sort((a: any, b: any) => b.created_at - a.created_at)[0];

    return latestAiDocWithCode;
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
