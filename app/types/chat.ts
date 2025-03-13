import type { DocTypes } from 'use-fireproof';
// Type definitions for segments
export type Segment = {
  type: 'markdown' | 'code';
  content: string;
};

// User message type
export type UserChatMessageDocument = {
  type: 'user';
  session_id: string;
  text: string;
  created_at: number;
};

// AI message type
export type AiChatMessageDocument = {
  type: 'ai';
  session_id: string;
  text: string; // Raw text content
  created_at: number;
};

// Union type for all message types
export type ChatMessageDocument = UserChatMessageDocument | AiChatMessageDocument;

export interface SessionDocument extends DocTypes {
  _id?: string;
  type: 'session'; // Document type for Fireproof queries
  title?: string;
  created_at: number;
}
export interface ChatInterfaceProps {
  chatState: {
    docs: ChatMessageDocument[];
    input: string;
    setInput: (input: string) => void;
    isStreaming: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    sendMessage: () => Promise<void>;
    title: string;
    sessionId?: string | null;
  };
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
  onNewChat?: () => void;
}
