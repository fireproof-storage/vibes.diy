import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, AiChatMessage, UserChatMessage } from '../types/chat';
import { parseContent } from '../utils/segmentParser';
import { debugLog as logDebug } from '../utils/debugLogging';

/**
 * Message storage design (per human.md):
 * - Session documents are stored with useDocument in useSession hook (type: 'session')
 * - User messages are stored as separate documents (type: 'user-message')
 * - AI messages are only stored as complete messages after streaming (type: 'ai-message')
 * - All documents use created_at: Date.now() instead of timestamp
 * - All message documents include session_id to link them to a session
 */

// Define document types internally since we don't have a separate file
interface MessageDocument {
  type: 'user-message' | 'ai-message';
  session_id: string;
  created_at: number;
}

interface UserMessageDocument extends MessageDocument {
  type: 'user-message';
  prompt: string;
}

interface AiMessageDocument extends MessageDocument {
  type: 'ai-message';
  rawMessage: string;
}

// Helper to check if a document is a message document
const isMessageDocument = (doc: any): boolean => {
  return (
    doc &&
    (doc.type === 'user-message' || doc.type === 'ai-message') &&
    typeof doc.session_id === 'string'
  );
};

export function useSessionMessages(sessionId: string | undefined) {
  // Use ref to track prior sessionId for comparison
  const prevSessionIdRef = useRef<string | undefined>(undefined);

  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  // Query for all message document types
  const { docs } = useLiveQuery('type', {
    keys: ['user-message', 'ai-message'],
    limit: 100,
  });

  // Debug log to check what docs are returned from Fireproof
  logDebug(`Fireproof docs returned: ${docs?.length || 0}, sessionId: ${sessionId}`);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Add state for current streaming message (memory only)
  const [streamingMessage, setStreamingMessage] = useState<AiChatMessage | null>(null);

  // Memoize parseContent to avoid regenerating in multiple places
  const parseMessageContent = useCallback((rawContent: string) => {
    return parseContent(rawContent);
  }, []);

  // Transform query results into messages - this is the main source of issues
  useEffect(() => {
    if (!docs) {
      logDebug('No docs available yet, waiting for data');
      return;
    }

    // Only process docs when needed - check if sessionId changed
    const sessionIdChanged = sessionId !== prevSessionIdRef.current;
    prevSessionIdRef.current = sessionId;

    // Exit early if no docs or no sessionId, preserving existing messages
    if (docs.length === 0 || !sessionId) {
      logDebug(
        `No docs found or no sessionId: { docsLength: ${docs?.length || 0}, sessionId: '${sessionId}' }`
      );
      // Only reset messages if we have a session ID but no docs
      // This allows virtual messages to persist when no sessionId exists
      if (sessionId && sessionIdChanged) {
        logDebug('Clearing messages because sessionId exists but no docs found');
        setMessages([]);
      }
      return;
    }

    // Skip reprocessing if sessionId hasn't changed
    if (!sessionIdChanged && messages.length > 0) {
      logDebug('SessionId unchanged, skipping reprocessing of messages');
      return;
    }

    // Filter for this session's messages
    const docsForThisSession = docs.filter(
      (doc: any) => isMessageDocument(doc) && doc.session_id === sessionId
    );
    logDebug(`Filtered ${docsForThisSession.length} docs for session: ${sessionId}`);

    const sortedMessages = docsForThisSession
      // Sort by created_at time
      .sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0))
      // Map to the appropriate message type
      .map((doc: any) => {
        if (doc.type === 'user-message') {
          const userDoc = doc as UserMessageDocument;
          return {
            type: 'user',
            text: userDoc.prompt,
            timestamp: userDoc.created_at, // Keep timestamp for compatibility
          } as UserChatMessage;
        } else {
          const aiDoc = doc as AiMessageDocument;
          // Parse raw content for AI messages
          const { segments, dependenciesString } = parseMessageContent(aiDoc.rawMessage);

          return {
            type: 'ai',
            text: aiDoc.rawMessage,
            segments,
            dependenciesString,
            isStreaming: false,
            timestamp: aiDoc.created_at, // Keep timestamp for compatibility
          } as AiChatMessage;
        }
      });

    logDebug(`Transformed ${sortedMessages.length} messages for session: ${sessionId}`);
    setMessages(sortedMessages);
  }, [docs, sessionId, parseMessageContent]);

  // Function to update streaming message directly (for external components)
  const updateStreamingMessage = useCallback(
    (rawMessage: string, timestamp: number) => {
      console.debug(`🔍 UPDATE STREAMING: msg length=${rawMessage.length}, timestamp=${timestamp}`);

      // IMPORTANT: Always continue if there's any content at all
      if (!rawMessage || rawMessage.trim().length === 0) {
        console.debug('🔍 UPDATE STREAMING: Empty message, skipping update');
        return;
      }

      const { segments, dependenciesString } = parseMessageContent(rawMessage);

      // Log what we're about to set as the streaming message
      console.debug(`🔍 SETTING STREAMING MESSAGE: ${segments.length} segments`);

      // Enhanced debugging for segments
      if (segments.length > 0) {
        segments.forEach((segment, i) => {
          console.debug(
            `🔍 STREAMING SEGMENT ${i}: type=${segment.type}, content length=${segment.content.length}, ` +
              `has content=${Boolean(segment.content && segment.content.trim().length > 0)}`
          );
        });
      } else {
        // If no segments but we have text, create a default markdown segment
        if (rawMessage.trim().length > 0) {
          console.debug(
            `🔍 No segments found but message has content, creating default markdown segment`
          );
          segments.push({
            type: 'markdown',
            content: rawMessage,
          });
        }
      }

      setStreamingMessage({
        type: 'ai',
        text: rawMessage,
        segments,
        dependenciesString,
        isStreaming: true,
        timestamp,
      } as AiChatMessage);
    },
    [parseMessageContent]
  );

  // Add a new user message
  const addUserMessage = useCallback(
    async (text: string) => {
      try {
        const created_at = Date.now();

        // If sessionId is null, create a virtual message in memory only
        if (!sessionId) {
          logDebug(`Creating virtual user message (no sessionId available)`);
          // Use functional update to avoid stale closure issues
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              type: 'user',
              text,
              timestamp: created_at,
            } as UserChatMessage,
          ]);
          return created_at;
        }

        logDebug(`Adding user message to session: ${sessionId}`);
        const result = await database.put({
          type: 'user-message',
          session_id: sessionId,
          prompt: text,
          created_at,
        } as UserMessageDocument);

        logDebug(`Successfully added user message with ID: ${result.id}`);
        return created_at;
      } catch (error) {
        console.error('Error adding user message:', error);
        return null;
      }
    },
    [sessionId, database]
  );

  // Add or update AI message with two modes:
  // 1. During streaming (isStreaming=true): Only update in-memory state, no database write
  // 2. Final message (isStreaming=false): Write to database and clear streaming state
  const addAiMessage = useCallback(
    async (rawMessage: string, created_at?: number, isStreaming: boolean = false) => {
      const timestamp = created_at || Date.now();

      // Skip empty messages
      if (!rawMessage || rawMessage.trim().length === 0) {
        console.debug('🔍 ADD_AI_MESSAGE: Empty message, skipping');
        return null;
      }

      if (isStreaming) {
        // STREAMING MODE: Always update in-memory state even without sessionId
        logDebug('Updating streaming message in memory only');
        const { segments, dependenciesString } = parseMessageContent(rawMessage);

        // Enhanced debugging for streaming message updates
        console.debug(
          `🔍 ADD_AI_MESSAGE (streaming=true): Raw length=${rawMessage.length}, segments=${segments.length}`
        );

        if (segments.length > 0) {
          segments.forEach((segment, i) => {
            console.debug(
              `  Segment ${i}: type=${segment.type}, length=${segment.content.length}, ` +
                `has content=${Boolean(segment.content && segment.content.trim().length > 0)}`
            );
          });
        } else {
          // If no segments but we have text, create a default markdown segment
          if (rawMessage.trim().length > 0) {
            console.debug(
              `🔍 No segments found but message has content, creating default markdown segment`
            );
            segments.push({
              type: 'markdown',
              content: rawMessage,
            });
          }
        }

        setStreamingMessage({
          type: 'ai',
          text: rawMessage,
          segments,
          dependenciesString,
          isStreaming: true,
          timestamp,
        } as AiChatMessage);

        return timestamp;
      } else {
        // FINAL MESSAGE: Needs a sessionId to write to database
        if (!sessionId) {
          logDebug('Cannot save final message: sessionId is null');
          return null;
        }

        // Write to database and clear streaming state
        logDebug('Writing final AI message to database');

        const result = await database.put({
          type: 'ai-message',
          session_id: sessionId,
          rawMessage,
          created_at: timestamp,
        } as AiMessageDocument);

        // Clear streaming message when done
        setStreamingMessage(null);
        logDebug(`Created new AI message with ID: ${result.id}`);

        return timestamp;
      }
    },
    [sessionId, database, parseMessageContent]
  );

  // Combine database messages with streaming message - this is a key source of issues
  const combinedMessages = useMemo(() => {
    // If no streaming message, just return the database messages
    if (!streamingMessage) return messages;

    // Enhanced check for streaming content - simplified to catch ANY valid content
    const hasStreamingContent = streamingMessage.text.trim().length > 0;

    // IMPORTANT CHANGE: Always include streaming message if it has ANY text content
    if (!hasStreamingContent) {
      return messages;
    }

    // If no sessionId, we might not have database messages, just add the streaming message
    if (!sessionId || messages.length === 0) {
      return [streamingMessage];
    }

    // Check if the streaming message already exists in the database messages
    const streamingMessageExists = messages.some(
      (msg) => msg.type === 'ai' && msg.timestamp === streamingMessage.timestamp
    );

    if (streamingMessageExists) {
      // Replace the database version with the streaming version
      return messages.map((msg) => {
        if (msg.type === 'ai' && msg.timestamp === streamingMessage.timestamp) {
          return streamingMessage;
        }
        return msg;
      });
    } else {
      // Add the streaming message to the list
      return [...messages, streamingMessage];
    }
  }, [messages, streamingMessage, sessionId]);

  const isLoading = !docs;

  // Return a stable object to ensure references don't change unnecessarily
  return useMemo(
    () => ({
      messages: combinedMessages,
      isLoading,
      addUserMessage,
      addAiMessage,
      updateStreamingMessage,
    }),
    [combinedMessages, isLoading, addUserMessage, addAiMessage, updateStreamingMessage]
  );
}
