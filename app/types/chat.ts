import type { DocTypes } from 'use-fireproof';
// Type definitions for segments
export type Segment = {
  type: 'markdown' | 'code';
  content: string;
};

// User message type
export type UserChatMessage = {
  type: 'user';
  text: string;
  timestamp?: number;
};

// AI message type
export type AiChatMessageDocument = {
  type: 'ai';
  session_id: string;
  text: string; // Raw text content
  created_at: number;
};

// Union type for all message types
export type ChatMessage = UserChatMessage | AiChatMessageDocument;

export interface SessionDocument extends DocTypes {
  _id?: string;
  type: 'session'; // Document type for Fireproof queries
  title?: string;
  prompt?: string;
  created_at: number;
}

export interface ChatInterfaceProps {
  chatState: {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isGenerating: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    autoResizeTextarea: () => void;
    scrollToBottom: () => void;
    sendMessage: () => Promise<void>;
    getCurrentCode: () => string;
  };
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
  onNewChat?: () => void;
  onCodeGenerated?: (code: string, dependencies?: Record<string, string>) => void;
}
