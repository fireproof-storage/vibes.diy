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
    <div className="flex h-[calc(100vh-2rem)] flex-col md:flex-row md:overflow-hidden">
      <ChatProvider
        initialState={{
          input: '',
          isGenerating: false,
          isSidebarVisible: false,
        }}
      >
        <div className="w-full md:h-full md:w-1/2">
          <ChatInterface
            chatState={chatState}
            sessionId={sessionId || null}
            onCodeGenerated={handleCodeGenerated}
          />
        </div>
        <div className="w-full md:h-full md:w-1/2 md:overflow-auto">
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
      </ChatProvider>
    </div>
  );
} 