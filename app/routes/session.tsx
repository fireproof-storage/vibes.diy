import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import ChatInterface from '../ChatInterface';
import { useFireproof } from 'use-fireproof';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import type { ChatMessage, AiChatMessage, SessionDocument, Segment } from '../types/chat';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { parseDependencies } from '../utils/segmentParser';
import AppLayout from '../components/AppLayout';

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
  const { database } = useFireproof('fireproof-chat-history');

  // Maintain a stable ref to the database to prevent re-renders
  const databaseRef = useRef(database);

  // Update database ref when it changes
  useEffect(() => {
    databaseRef.current = database;
  }, [database]);

  // Use the simple chat hook
  const chatState = useSimpleChat();

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

  // Handle session change
  useEffect(() => {
    // Load session data and extract code for the ResultPreview
    const loadSessionData = async () => {
      if (sessionId) {
        try {
          // Load the session document
          const sessionData = (await databaseRef.current.get(sessionId)) as SessionDocument;

          // Normalize session data to guarantee messages array exists
          const messages = Array.isArray(sessionData.messages) ? sessionData.messages : [];

          // Clear current messages and set the loaded ones
          chatState.setMessages(messages);

          // Find the last AI message with code to update the ResultPreview
          const lastAiMessageWithCode = [...messages]
            .reverse()
            .find((msg: ChatMessage) => msg.type === 'ai');

          // If we found an AI message with code, update the code view
          if (lastAiMessageWithCode?.type === 'ai') {
            const aiMessage = lastAiMessageWithCode as AiChatMessage;
            if (aiMessage.segments) {
              const codeSegment = aiMessage.segments.find(seg => seg.type === 'code');
              if (codeSegment) {
                const dependencies = getDependencies() || {};
                
                // Update state for ResultPreview
                setState({
                  generatedCode: codeSegment.content,
                  dependencies: dependencies,
                });
              }
            }
          }
        } catch (error) {
          console.error('Error loading session:', error);
        }
      }
    };

    loadSessionData();
  }, [sessionId, chatState.setMessages, getDependencies]); 

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
          sessionId={sessionId}
          onSessionCreated={handleCodeGenerated}
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
