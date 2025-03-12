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
export type AiChatMessage = {
  type: 'ai';
  text: string; // Raw text content
  segments: Segment[]; // Parsed segments
  dependenciesString?: string; // Raw dependencies for downstream parsing
  isStreaming?: boolean; // Whether this message is currently streaming
  timestamp?: number;
};

// Union type for all message types
export type ChatMessage = UserChatMessage | AiChatMessage;

export interface SessionDocument {
  _id: string;
  type?: 'session'; // Document type for Fireproof queries
  title?: string;
  timestamp: number;
  messages?: ChatMessage[];
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
    currentSegments: () => Segment[];
    getCurrentCode: () => string;
  };
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
  onNewChat?: () => void;
  onCodeGenerated?: (code: string, dependencies?: Record<string, string>) => void;
}
