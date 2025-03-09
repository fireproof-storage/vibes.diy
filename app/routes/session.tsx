import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import ChatInterface from '../ChatInterface';
import { useChat } from '../hooks/useChat';
import { useFireproof } from 'use-fireproof';
import { ChatProvider } from '../context/ChatContext';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import type { ChatMessage, SessionDocument } from '../types/chat';

export function meta() {
  return [
    { title: 'Session - Fireproof App Builder' },
    { name: 'description', content: 'Chat session in Fireproof App Builder' },
  ];
}

export default function Session() {
  const { sessionId, title } = useParams();
  console.log('Session component rendering with sessionId:', sessionId);

  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });
  const { database } = useFireproof('fireproof-chat-history');

  // Handle code generation from chat interface
  const handleCodeGenerated = (code: string, dependencies: Record<string, string> = {}) => {
    console.log('Session.handleCodeGenerated called with code length:', code.length);
    setState({
      generatedCode: code,
      dependencies,
    });
  };

  // Set up chat state with the code generation handler
  const chatState = useChat(handleCodeGenerated);

  // Handle session change
  useEffect(() => {
    // Load session data and extract code for the ResultPreview
    const loadSessionData = async () => {
      if (sessionId) {
        console.log('Session route: Loading session data for ID:', sessionId);
        try {
          // Load the session document
          const sessionData = (await database.get(sessionId)) as SessionDocument;
          console.log('Session route: Successfully loaded data for session:', sessionId);

          // Normalize session data to guarantee messages array exists
          const messages = Array.isArray(sessionData.messages) ? sessionData.messages : [];

          // Clear current messages and set the loaded ones
          chatState.setMessages(messages);

          // Find the last AI message with code to update the ResultPreview
          const lastAiMessageWithCode = [...messages]
            .reverse()
            .find((msg: ChatMessage) => msg.type === 'ai' && msg.code);

          // If we found an AI message with code, update the code view
          if (lastAiMessageWithCode?.code) {
            const dependencies = lastAiMessageWithCode.dependencies || {};
            console.log(
              'Session route: Found code in session:',
              sessionId.substring(0, 8),
              'code length:',
              lastAiMessageWithCode.code.length
            );

            // Update state for ResultPreview
            setState({
              generatedCode: lastAiMessageWithCode.code,
              dependencies: dependencies,
            });

            // Also update the chat state for consistency
            chatState.completedCode = lastAiMessageWithCode.code;
            chatState.streamingCode = lastAiMessageWithCode.code;
            chatState.completedMessage = lastAiMessageWithCode.text || "Here's your app:";
          } else {
            console.log('Session route: No code found in session:', sessionId.substring(0, 8));
          }
        } catch (error) {
          console.error('Error loading session:', error);
        }
      }
    };

    loadSessionData();
  }, [sessionId, database, chatState]);

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
          initialView="code"
          sessionId={sessionId}
        />
      </div>
    </div>
  );
}
