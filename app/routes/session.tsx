import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import ChatInterface from '../ChatInterface';
import { useChat } from '../hooks/useChat';
import { useFireproof } from 'use-fireproof';
import { ChatProvider } from '../context/ChatContext';
import ResultPreview from '../components/ResultPreview/ResultPreview';

export function meta() {
  return [
    { title: 'Session - Fireproof App Builder' },
    { name: 'description', content: 'Chat session in Fireproof App Builder' },
  ];
}

export default function Session() {
  const { sessionId, title } = useParams();
  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });
  const { database } = useFireproof('fireproof-chat-history');
  
  // Handle code generation from chat interface
  const handleCodeGenerated = (code: string, dependencies: Record<string, string> = {}) => {
    setState({
      generatedCode: code,
      dependencies,
    });
  };
  
  // Set up chat state with the code generation handler
  const chatState = useChat(handleCodeGenerated);
  
  // Handle session change
  useEffect(() => {
    // The sessionId is from URL params, so it's already set
    // We don't need to call setSessionId since we're using the param directly
    
    // Clear messages when switching sessions
    if (sessionId) {
      chatState.setMessages([]);
    }
  }, [sessionId, chatState.setMessages]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh)' }}>
      <div style={{ flex: '0 0 33.333%', overflow: 'hidden', position: 'relative' }}>
        <ChatProvider
          initialState={{
            input: '',
            isGenerating: false,
            isSidebarVisible: false,
          }}
        >
          <ChatInterface
            chatState={chatState}
            sessionId={sessionId || null}
            onCodeGenerated={handleCodeGenerated}
          />
        </ChatProvider>
      </div>
      <div style={{ flex: '0 0 66.667%', overflow: 'hidden', position: 'relative' }}>
        <ResultPreview
          code={state.generatedCode}
          dependencies={state.dependencies}
          streamingCode={chatState.streamingCode}
          isStreaming={chatState.isStreaming}
          completedMessage={chatState.completedMessage}
          currentStreamContent={chatState.currentStreamedText}
          currentMessage={
            chatState.messages.length > 0
              ? { content: chatState.messages[chatState.messages.length - 1].text }
              : undefined
          }
        />
      </div>
    </div>
  );
} 