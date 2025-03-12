import { useEffect, useState } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, UserChatMessage, AiChatMessage } from '../types/chat';
import { parseContent } from '../utils/segmentParser';

// Base message document with common fields
interface BaseMessageDocument {
  _id: string;
  type: 'message';
  session_id: string;
  message_type: 'user' | 'ai';
  timestamp: number;
}

// User message document stores text directly
interface UserMessageDocument extends BaseMessageDocument {
  message_type: 'user';
  text: string;
}

// AI message document stores raw stream content
interface AiMessageDocument extends BaseMessageDocument {
  message_type: 'ai';
  raw_content: string; // Raw stream content before parsing
}

// Union type for all message documents
type MessageDocument = UserMessageDocument | AiMessageDocument;

// Type guard for message documents
function isMessageDocument(doc: any): doc is MessageDocument {
  return (
    doc.type === 'message' && 
    doc.session_id !== undefined && 
    doc.message_type !== undefined
  );
}

export function useSessionMessages(sessionId: string | null) {
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);
  
  // Query for messages by their 'type' index
  const { docs } = useLiveQuery('type', { 
    key: 'message',
    limit: 100
  });
  
  // Debug log to check what docs are returned from Fireproof
  console.log('useSessionMessages: Fireproof docs returned:', docs?.length || 0, 
              'sessionId:', sessionId);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Transform query results into messages
  useEffect(() => {
    if (!docs || docs.length === 0 || !sessionId) {
      console.log('useSessionMessages: No docs, empty docs, or no sessionId:', {
        docsLength: docs?.length || 0,
        sessionId
      });
      return;
    }
    
    // Debug log for the filtering process
    console.log('useSessionMessages: Processing docs for session:', sessionId, 
                'Total docs:', docs.length);
    
    // Log all session IDs to debug filtering
    const allSessionIds = docs.map((doc: any) => doc.session_id).filter(Boolean);
    console.log('useSessionMessages: All session IDs in docs:', allSessionIds);
    
    // Filter for this session's messages and convert them to chat messages
    const docsForThisSession = docs.filter((doc: any) => 
      isMessageDocument(doc) && doc.session_id === sessionId
    );
    console.log('useSessionMessages: Docs for this session:', docsForThisSession.length);
    
    // Deduplicate messages - this is critical to prevent duplicate UI elements
    // Use a Map to only keep the latest message with a given timestamp
    const messagesByTimestamp = new Map();
    docsForThisSession.forEach((doc: any) => {
      // For messages with the same timestamp, keep the one with the most recent _rev
      const existingDoc = messagesByTimestamp.get(doc.timestamp);
      if (!existingDoc || (doc._rev && existingDoc._rev && doc._rev > existingDoc._rev)) {
        messagesByTimestamp.set(doc.timestamp, doc);
      }
    });
    
    // Convert the Map values back to an array
    const uniqueDocs = Array.from(messagesByTimestamp.values());
    console.log('useSessionMessages: After deduplication:', uniqueDocs.length, 'messages');
    
    const sortedMessages = uniqueDocs
      // Sort by timestamp
      .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0))
      // Map to the appropriate message type
      .map((doc: any) => {
        if (doc.message_type === 'user') {
          const userDoc = doc as UserMessageDocument;
          return {
            type: 'user',
            text: userDoc.text,
            timestamp: userDoc.timestamp
          } as UserChatMessage;
        } else {
          const aiDoc = doc as AiMessageDocument;
          // Parse raw content for AI messages
          const { segments, dependenciesString } = parseContent(aiDoc.raw_content);
          
          return {
            type: 'ai',
            text: aiDoc.raw_content,
            segments,
            dependenciesString,
            isStreaming: false,
            timestamp: aiDoc.timestamp
          } as AiChatMessage;
        }
      });
    
    // Log the results of filtering and transformation
    console.log('useSessionMessages: Filtered messages for session:', 
                sessionId, 'Count:', sortedMessages.length);
    
    setMessages(sortedMessages);
  }, [docs, sessionId]);

  // Add a new user message
  const addUserMessage = async (text: string) => {
    if (!sessionId) return;
    
    try {
      const timestamp = Date.now();
      console.log('useSessionMessages: Adding user message to session:', 
                  sessionId, 'Text:', text.substring(0, 30) + '...');
      
      await database.put({
        type: 'message',
        session_id: sessionId,
        message_type: 'user',
        text,
        timestamp
      } as UserMessageDocument);
      
      console.log('useSessionMessages: Successfully added user message at timestamp:', timestamp);
      return timestamp;
    } catch (error) {
      console.error('Error adding user message:', error);
      return null;
    }
  };

  // Add or update an AI message
  const updateAiMessage = async (rawContent: string, isStreaming: boolean = false, timestamp?: number) => {
    if (!sessionId) return;
    
    try {
      const now = timestamp || Date.now();
      
      // First, check if we already know about this message in our local state
      let existingMessageId = null;
      
      // Store a reference to the last AI message ID and timestamp for this session
      if (timestamp) {
        // Check if we have an existing AI message with this timestamp in our current docs
        if (docs) {
          const existingMessage = docs.find((doc: any) => 
            doc.type === 'message' && 
            doc.session_id === sessionId && 
            doc.message_type === 'ai' && 
            doc.timestamp === now
          );
          
          if (existingMessage) {
            existingMessageId = existingMessage._id;
          }
        }
      }
      
      if (existingMessageId) {
        // Update the existing message by providing its ID
        await database.put({
          _id: existingMessageId,
          type: 'message',
          session_id: sessionId,
          message_type: 'ai',
          raw_content: rawContent,
          timestamp: now
        });
        console.log('useSessionMessages: Updated existing AI message with ID:', existingMessageId);
      } else {
        // Create a new message
        const result = await database.put({
          type: 'message',
          session_id: sessionId,
          message_type: 'ai',
          raw_content: rawContent,
          timestamp: now
        } as AiMessageDocument);
        console.log('useSessionMessages: Created new AI message with ID:', result.id);
      }
      
      return now;
    } catch (error) {
      console.error('Error updating AI message:', error);
      return null;
    }
  };

  return {
    messages,
    isLoading: !docs,
    addUserMessage,
    updateAiMessage
  };
} 