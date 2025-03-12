import { useEffect, useState, useMemo } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, UserChatMessage, AiChatMessage } from '../types/chat';
import { parseContent } from '../utils/segmentParser';

/**
 * Message storage design (per human.md):
 * - Session documents are stored with useDocument in useSession hook (type: 'session')
 * - User messages are stored as separate documents (type: 'user-message')
 * - AI messages are only stored as complete messages after streaming (type: 'ai-message')
 * - All documents use created_at: Date.now() instead of timestamp
 * - All message documents include session_id to link them to a session
 */

// Base message document with common fields
interface BaseMessageDocument {
  _id?: string;
  type: 'user-message' | 'ai-message';
  session_id: string;
  created_at: number;
}

// User message document stores text directly
interface UserMessageDocument extends BaseMessageDocument {
  type: 'user-message';
  prompt: string;
}

// AI message document stores raw stream content
interface AiMessageDocument extends BaseMessageDocument {
  type: 'ai-message';
  rawMessage: string; // Raw stream content before parsing
}

// Union type for all message documents
type MessageDocument = UserMessageDocument | AiMessageDocument;

// Type guard for message documents
function isMessageDocument(doc: any): doc is MessageDocument {
  return (doc.type === 'user-message' || doc.type === 'ai-message') && doc.session_id !== undefined;
}

export function useSessionMessages(sessionId: string | null) {
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);

  // Query for all message document types
  const { docs } = useLiveQuery('type', {
    keys: ['user-message', 'ai-message'],
    limit: 100,
  });

  // Debug log to check what docs are returned from Fireproof
  console.log(
    'useSessionMessages: Fireproof docs returned:',
    docs?.length || 0,
    'sessionId:',
    sessionId
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Add state for current streaming message (memory only)
  const [streamingMessage, setStreamingMessage] = useState<AiChatMessage | null>(null);

  // Transform query results into messages
  useEffect(() => {
    if (!docs || docs.length === 0 || !sessionId) {
      console.log('useSessionMessages: No docs, empty docs, or no sessionId:', {
        docsLength: docs?.length || 0,
        sessionId,
      });
      return;
    }

    // Debug log for the filtering process
    console.log(
      'useSessionMessages: Processing docs for session:',
      sessionId,
      'Total docs:',
      docs.length
    );

    // Filter for this session's messages
    const docsForThisSession = docs.filter(
      (doc: any) => isMessageDocument(doc) && doc.session_id === sessionId
    );
    console.log('useSessionMessages: Docs for this session:', docsForThisSession.length);

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
          const { segments, dependenciesString } = parseContent(aiDoc.rawMessage);

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

    // Log the results of filtering and transformation
    console.log(
      'useSessionMessages: Filtered messages for session:',
      sessionId,
      'Count:',
      sortedMessages.length
    );

    setMessages(sortedMessages);
  }, [docs, sessionId]);

  // Add a new user message
  const addUserMessage = async (text: string) => {
    if (!sessionId) return null;

    try {
      const created_at = Date.now();
      console.log(
        'useSessionMessages: Adding user message to session:',
        sessionId,
        'Text:',
        text.substring(0, 30) + '...'
      );

      const result = await database.put({
        type: 'user-message',
        session_id: sessionId,
        prompt: text,
        created_at,
      } as UserMessageDocument);

      console.log('useSessionMessages: Successfully added user message with ID:', result.id);
      return created_at;
    } catch (error) {
      console.error('Error adding user message:', error);
      return null;
    }
  };

  // Add or update AI message with two modes:
  // 1. During streaming (isStreaming=true): Only update in-memory state, no database write
  // 2. Final message (isStreaming=false): Write to database and clear streaming state
  const addAiMessage = async (
    rawMessage: string,
    created_at?: number,
    isStreaming: boolean = false
  ) => {
    if (!sessionId) return null;

    try {
      const timestamp = created_at || Date.now();

      if (isStreaming) {
        // STREAMING MODE: Only update in-memory state, no database write
        console.log('useSessionMessages: Updating streaming message in memory only');
        const { segments, dependenciesString } = parseContent(rawMessage);

        // Enhanced debugging for streaming message updates
        console.debug(
          `🔍 ADD_AI_MESSAGE (streaming=true): Raw length=${rawMessage.length}, segments=${segments.length}`
        );
        
        if (segments.length > 0) {
          console.debug('🔍 SEGMENTS CREATED DURING STREAMING:');
          segments.forEach((segment, i) => {
            console.debug(
              `  Segment ${i}: type=${segment.type}, length=${segment.content.length}, ` +
              `has content=${Boolean(segment.content && segment.content.trim().length > 0)}`
            );
          });
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
        // FINAL MESSAGE: Write to database and clear streaming state
        console.log('useSessionMessages: Writing final AI message to database');

        const result = await database.put({
          type: 'ai-message',
          session_id: sessionId,
          rawMessage,
          created_at: timestamp,
        } as AiMessageDocument);

        // Clear streaming message when done
        setStreamingMessage(null);
        console.log('useSessionMessages: Created new AI message with ID:', result.id);

        return timestamp;
      }
    } catch (error) {
      console.error('Error with AI message:', error);
      return null;
    }
  };

  // Combine database messages with streaming message
  const combinedMessages = useMemo(() => {
    // If no streaming message, just return the database messages
    if (!streamingMessage) return messages;

    // Debug the content we're working with
    console.debug(
      `🔍 COMBINING MESSAGES: db msgs=${messages.length}, streaming has ${streamingMessage.segments?.length || 0} segments`
    );

    // Enhanced check for streaming content - improved to catch even small valid content
    let hasStreamingContent =
      streamingMessage.text.length > 0 &&
      (Array.isArray(streamingMessage.segments) && 
       streamingMessage.segments.length > 0 && 
       streamingMessage.segments.some(segment => 
         segment && segment.content && segment.content.trim().length > 0
       ));

    // Enhanced debugging
    console.debug(`🔍 STREAMING MESSAGE TEXT: "${streamingMessage.text.substring(0, 50)}..."`);
    console.debug(`🔍 HAS STREAMING CONTENT: ${hasStreamingContent}`);
    
    if (streamingMessage.segments && streamingMessage.segments.length > 0) {
      console.debug('🔍 STREAMING MESSAGE SEGMENTS:');
      streamingMessage.segments.forEach((segment, i) => {
        if (segment && segment.content) {
          console.debug(
            `  Segment ${i}: type=${segment.type}, content=${segment.content.substring(0, Math.min(30, segment.content.length))}...`
          );
        } else {
          console.debug(`  Segment ${i}: type=${segment?.type || 'undefined'}, content=undefined or empty`);
        }
      });
    }

    // IMPORTANT: Even with apparently no content, if we're streaming and have text,
    // include the message to ensure early updates are visible
    if (!hasStreamingContent && streamingMessage.text.trim().length > 0) {
      console.debug('🔍 STREAMING MESSAGE HAS TEXT BUT NO PARSED SEGMENTS WITH CONTENT');
      console.debug('   Forcing inclusion of the streaming message to fix update lag');
      
      // Update streaming flag
      streamingMessage.isStreaming = true;
      hasStreamingContent = true;
    } else if (!hasStreamingContent) {
      console.debug('🔍 STREAMING MESSAGE HAS NO CONTENT, skipping');
      return messages;
    }

    console.debug(`🔍 STREAMING MESSAGE HAS CONTENT, adding to combined messages`);

    // Check if the streaming message already exists in the database messages
    const streamingMessageExists = messages.some(
      (msg) => msg.type === 'ai' && msg.timestamp === streamingMessage.timestamp
    );

    if (streamingMessageExists) {
      // Replace the database version with the streaming version
      console.debug('🔍 REPLACING existing message with streaming version');
      return messages.map((msg) => {
        if (msg.type === 'ai' && msg.timestamp === streamingMessage.timestamp) {
          return streamingMessage;
        }
        return msg;
      });
    } else {
      // Add the streaming message to the list
      console.debug('🔍 ADDING new streaming message to list');
      return [...messages, streamingMessage];
    }
  }, [messages, streamingMessage]);

  // Function to update streaming message directly (for external components)
  const updateStreamingMessage = (rawMessage: string, timestamp: number) => {
    console.debug(`🔍 UPDATE STREAMING: msg length=${rawMessage.length}, timestamp=${timestamp}`);

    const { segments, dependenciesString } = parseContent(rawMessage);

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
    }

    setStreamingMessage({
      type: 'ai',
      text: rawMessage,
      segments,
      dependenciesString,
      isStreaming: true,
      timestamp,
    } as AiChatMessage);
  };

  return {
    messages: combinedMessages,
    isLoading: !docs,
    addUserMessage,
    addAiMessage,
    updateStreamingMessage, // New direct update function
  };
}
