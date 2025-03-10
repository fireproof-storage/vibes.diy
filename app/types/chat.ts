export interface ChatMessage {
  text: string;
  type: 'user' | 'ai';
  code?: string;
  dependencies?: Record<string, string>;
  streaming?: boolean;
  completed?: boolean;
  rawContent?: string;      // Full unprocessed stream content
  segments?: Array<{        // Pre-processed message segments
    type: 'text' | 'pre-code' | 'code' | 'post-code';
    content: string;
  }>;
}

export interface SessionDocument {
  _id: string;
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
    currentStreamedText: string;
    streamingCode: string;
    completedCode: string;
    isStreaming: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    autoResizeTextarea: () => void;
    scrollToBottom: () => void;
    sendMessage: () => Promise<void>;
    parserState: React.MutableRefObject<{
      inCodeBlock: boolean;
      codeBlockContent: string;
      dependencies: Record<string, string>;
      displayText: string;
      on: (event: string, callback: Function) => void;
      removeAllListeners: () => void;
      write: (chunk: string) => void;
      end: () => void;
      reset: () => void;
    }>;
    completedMessage: string;
  };
  sessionId?: string | null;
  onSessionCreated?: (newSessionId: string) => void;
  onNewChat?: () => void;
  onCodeGenerated?: (code: string, dependencies?: Record<string, string>) => void;
}
