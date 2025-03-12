import { useEffect, useState } from 'react';
import { useFireproof } from 'use-fireproof';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import type { ChatMessage, UserChatMessage, AiChatMessage } from '../types/chat';
import { parseContent } from '../utils/segmentParser';

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
  return (
    (doc.type === 'user-message' || doc.type === 'ai-message') && 
    doc.session_id !== undefined
  );
}

export function useSessionMessages(sessionId: string | null) {
  const { database, useLiveQuery } = useFireproof(FIREPROOF_CHAT_HISTORY);
  
  // Query for all message document types
  const { docs } = useLiveQuery('type', { 
    keys: ['user-message', 'ai-message'],
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
    
    // Filter for this session's messages
    const docsForThisSession = docs.filter((doc: any) => 
      isMessageDocument(doc) && doc.session_id === sessionId
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
            timestamp: userDoc.created_at // Keep timestamp for compatibility
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
            timestamp: aiDoc.created_at // Keep timestamp for compatibility
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
    if (!sessionId) return null;
    
    try {
      const created_at = Date.now();
      console.log('useSessionMessages: Adding user message to session:', 
                  sessionId, 'Text:', text.substring(0, 30) + '...');
      
      const result = await database.put({
        type: 'user-message',
        session_id: sessionId,
        prompt: text,
        created_at
      } as UserMessageDocument);
      
      console.log('useSessionMessages: Successfully added user message with ID:', result.id);
      return created_at;
    } catch (error) {
      console.error('Error adding user message:', error);
      return null;
    }
  };

  // Add a complete AI message - only called when streaming is complete
  const addAiMessage = async (rawMessage: string, created_at?: number) => {
    if (!sessionId) return null;
    
    try {
      const timestamp = created_at || Date.now();
      
      const result = await database.put({
        type: 'ai-message',
        session_id: sessionId,
        rawMessage,
        created_at: timestamp
      } as AiMessageDocument);
      
      console.log('useSessionMessages: Created new AI message with ID:', result.id);
      return timestamp;
    } catch (error) {
      console.error('Error adding AI message:', error);
      return null;
    }
  };

  return {
    messages,
    isLoading: !docs,
    addUserMessage,
    addAiMessage
  };
} 