import type { DocTypes } from 'use-fireproof';

// ===== Content Segment Types =====
export type Segment = {
  type: 'markdown' | 'code';
  content: string;
};

// ===== Document Types =====
// Base message document types for Fireproof storage
export type UserChatMessageDocument = {
  type: 'user';
  session_id: string;
  text: string;
  created_at: number;
};

export type AiChatMessageDocument = {
  type: 'ai';
  session_id: string;
  text: string; // Raw text content
  created_at: number;
};

export type ChatMessageDocument = (UserChatMessageDocument | AiChatMessageDocument) & {
  _id?: string;
};

export interface SessionDocument extends DocTypes {
  _id?: string;
  type: 'session'; // Document type for Fireproof queries
  title?: string;
  created_at: number;
}

// ===== UI Enhanced Types =====
// Enhanced types with additional UI properties
export type ChatMessage = ChatMessageDocument & {
  text: string;
  timestamp?: number;
};

// User chat message type used in the UI
export type UserChatMessage = ChatMessage & {
  type: 'user';
};

// Enhanced AiChatMessage type with segments for structured display
export type AiChatMessage = ChatMessage & {
  type: 'ai';
  segments?: Segment[];
  isStreaming?: boolean;
};

// ===== Component Props =====
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

// Base message document interface from useSessionMessages
export interface MessageDocument {
  type: 'user-message' | 'ai-message';
  session_id: string;
  created_at: number;
}

// User message document interface from useSessionMessages
export interface UserMessageDocument extends MessageDocument {
  type: 'user-message';
  prompt: string;
}

// AI message document interface from useSessionMessages
export interface AiMessageDocument extends MessageDocument {
  type: 'ai-message';
  rawMessage: string;
}
