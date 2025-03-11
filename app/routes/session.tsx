import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import ChatInterface from '../ChatInterface';
import { useFireproof } from 'use-fireproof';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import type { ChatMessage, AiChatMessage, SessionDocument, Segment } from '../types/chat';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { parseDependencies } from '../utils/segmentParser';
import AppLayout from '../components/AppLayout';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';

export function meta() {
  return [
    { title: 'Session - Fireproof App Builder' },
    { name: 'description', content: 'Chat session in Fireproof App Builder' },
  ];
}

export default function Session() {
  const { sessionId } = useParams();

  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });

  // Use the simple chat hook with sessionId
  const chatState = useSimpleChat(sessionId || null);

  // Helper function to extract dependencies from segments
  const getDependencies = useCallback(() => {
    const lastAiMessage = [...chatState.messages].reverse().find(
      (msg): msg is AiChatMessage => msg.type === 'ai'
    );
    
    if (lastAiMessage?.dependenciesString) {
      return parseDependencies(lastAiMessage.dependenciesString);
    }
    
    return {};
  }, [chatState.messages]);

  // Handle code generation from chat interface with stable callback reference
  const handleCodeGenerated = useCallback(
    (code: string, dependencies: Record<string, string> = {}) => {
      setState({
        generatedCode: code,
        dependencies,
      });
    },
    []
  );

  // Extract code and dependencies when AI message completes
  useEffect(() => {
    // Find the last AI message
    const lastAiMessage = [...chatState.messages].reverse().find(
      (msg) => msg.type === 'ai' && !msg.isStreaming
    );
    
    // If we found a completed AI message, extract code and dependencies
    if (lastAiMessage && lastAiMessage.type === 'ai') {
      const code = chatState.getCurrentCode();
      if (code) {
        // Extract dependencies from segments
        const dependencies = getDependencies() || {};
        handleCodeGenerated(code, dependencies);
      }
    }
  }, [chatState.messages, chatState.getCurrentCode, getDependencies, handleCodeGenerated]);

  // Handle new chat creation
  const handleNewChat = useCallback(() => {
    // Navigate to home to create a new session
    window.location.href = '/';
  }, []);

  return (
    <AppLayout
      chatPanel={
        <ChatInterface
          chatState={chatState}
          sessionId={sessionId || null}
          onNewChat={handleNewChat}
        />
      }
      previewPanel={
        <ResultPreview
          code={state.generatedCode}
          dependencies={state.dependencies}
          streamingCode={chatState.getCurrentCode()}
          isStreaming={chatState.isGenerating}
          completedMessage={
            chatState.messages.length > 0
              ? chatState.messages.filter(msg => msg.type === 'ai').pop()?.text || ''
              : ''
          }
          currentStreamContent={chatState.currentSegments()
            .filter((seg: Segment) => seg.type === 'markdown')
            .map((seg: Segment) => seg.content)
            .join('')}
          currentMessage={
            chatState.messages.length > 0
              ? { content: chatState.messages[chatState.messages.length - 1].text }
              : undefined
          }
        />
      }
    />
  );
}
