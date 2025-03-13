import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type {
  Segment,
  SessionDocument,
  ChatMessageDocument,
  UserChatMessageDocument,
  AiChatMessageDocument,
  ChatMessage,
  AiChatMessage,
  ChatInterfaceProps,
} from './types/chat';
import { useFireproof } from 'use-fireproof';
import SessionSidebar from './components/SessionSidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import QuickSuggestions from './components/QuickSuggestions';
import { FIREPROOF_CHAT_HISTORY } from './config/env';
import { parseContent } from './utils/segmentParser';

// Helper function to encode titles for URLs
function encodeTitle(title: string): string {
  return encodeURIComponent(title || 'untitled-session')
    .toLowerCase()
    .replace(/%20/g, '-');
}

function logDebug(message: string) {
  console.debug(`🔍 CHAT_INTERFACE: ${message}`);
}

// function convertDocsToMessages(docs: ChatMessageDocument[]): ChatMessage[] {
//   return docs.map((doc) => {
//     const text = doc.text || '';
//     const timestamp = doc.created_at;

//     // For user messages, create a single markdown segment
//     if (doc.type === 'user') {
//       return doc as UserChatMessageDocument;
//     }

//     // For AI messages, parse the content into segments
//     const { segments, dependenciesString } = parseContent(text);

//     return {
//       _id: doc._id,
//       segments,
//     } as AiChatMessage;
//   });
// }

function ChatInterface({ chatState }: ChatInterfaceProps) {
  // Extract commonly used values from chatState to avoid repetition
  const {
    docs: messages,
    input,
    setInput,
    isStreaming,
    inputRef,
    sendMessage,
    sessionId,
    title,
    // selectedResponseDoc,
    // selectedSegments,
    // selectedCode,
    // selectedDependenciesString,
  } = chatState;
  // State for UI transitions and sharing
  const [isShrinking, setIsShrinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Convert docs to messages
  // const messages = useMemo(() => convertDocsToMessages(docs), [docs]);

  // Sidebar visibility functions
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Function to handle input changes
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  // Function to handle keyboard events in textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
        e.preventDefault();
        sendMessage();
      }
    },
    [isStreaming, sendMessage]
  );

  // Function to handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      setInput(suggestion);

      // Focus the input and position cursor at the end
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Move cursor to end of text
          inputRef.current.selectionStart = inputRef.current.selectionEnd = suggestion.length;
        }
      }, 0);
    },
    [setInput, inputRef]
  );

  // Memoize the MessageList component to prevent unnecessary re-renders
  const memoizedMessageList = useMemo(() => {
    logDebug(
      `Creating MessageList with sessionId=${sessionId}, messages=${messages.length}, isStreaming=${isStreaming}`
    );

    return (
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        isShrinking={isShrinking}
        isExpanding={isExpanding}
      />
    );
  }, [sessionId, messages, isStreaming, isShrinking, isExpanding]);

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader onOpenSidebar={openSidebar} title={title} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full flex-1 flex-col">
          {memoizedMessageList}
          {messages.length === 0 && (
            <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />
          )}
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            disabled={isStreaming}
            inputRef={inputRef}
          />
        </div>
      </div>
      <SessionSidebar isVisible={isSidebarVisible} onClose={closeSidebar} />
    </div>
  );
}

export default ChatInterface;
