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
  title_generated?: boolean;
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
  // Using a simpler approach to avoid TypeScript errors with custom filter functions
  const { docs } = useLiveQuery('type', { 
    key: 'message',
    limit: 100
  });
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Transform query results into messages
  useEffect(() => {
    if (!docs || docs.length === 0 || !sessionId) return;
    
    // Filter for this session's messages and convert them to chat messages
    const sortedMessages = docs
      // First filter for this session (manually, since we can't use complex queries yet)
      .filter((doc: any) => 
        isMessageDocument(doc) && doc.session_id === sessionId
      )
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
    
    setMessages(sortedMessages);
  }, [docs, sessionId]);

  // Add a new user message
  const addUserMessage = async (text: string) => {
    if (!sessionId) return;
    
    try {
      const timestamp = Date.now();
      await database.put({
        type: 'message',
        session_id: sessionId,
        message_type: 'user',
        text,
        timestamp
      } as UserMessageDocument);
      
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
      await database.put({
        type: 'message',
        session_id: sessionId,
        message_type: 'ai',
        raw_content: rawContent,
        timestamp: now
      } as AiMessageDocument);
      
      return now;
    } catch (error) {
      console.error('Error updating AI message:', error);
      return null;
    }
  };

  // Mark an AI message as having its title generated
  const markTitleGenerated = async (messageTimestamp: number) => {
    if (!sessionId || !docs) return;
    
    try {
      // Find the message by timestamp
      const messageDoc = docs.find(
        (doc: any) => 
          isMessageDocument(doc) && 
          doc.message_type === 'ai' && 
          doc.session_id === sessionId &&
          doc.timestamp === messageTimestamp
      ) as AiMessageDocument | undefined;
      
      if (messageDoc) {
        await database.put({
          ...messageDoc,
          title_generated: true
        });
      }
    } catch (error) {
      console.error('Error marking title as generated:', error);
    }
  };

  return {
    messages,
    isLoading: !docs,
    addUserMessage,
    updateAiMessage,
    markTitleGenerated
  };
} 