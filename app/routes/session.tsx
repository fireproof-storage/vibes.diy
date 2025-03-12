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

// Utility functions for URL state encoding/decoding
function encodeStateToUrl(code: string, dependencies: Record<string, string>) {
  try {
    const stateObj = { code, dependencies };
    const jsonStr = JSON.stringify(stateObj);
    const encoded = btoa(encodeURIComponent(jsonStr));
    return encoded;
  } catch (error) {
    console.error('Error encoding state to URL:', error);
    return '';
  }
}

export default function Session() {
  const { sessionId } = useParams();

  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });
  const [shareStatus, setShareStatus] = useState<string>('');

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

  // Handle sharing functionality
  function handleShare() {
    if (!state.generatedCode) {
      alert('Generate an app first before sharing!');
      return;
    }

    const encoded = encodeStateToUrl(state.generatedCode, state.dependencies);
    if (encoded) {
      const shareUrl = `${window.location.origin}/home#state=${encoded}`;

      // Use optional chaining for Web Share API check
      const canUseShareApi = Boolean(navigator && 'share' in navigator);

      if (canUseShareApi) {
        navigator
          .share({
            title: 'Fireproof App',
            text: 'Check out this app I built with Fireproof App Builder!',
            url: shareUrl,
          })
          .catch(() => {
            copyToClipboard(shareUrl);
          });
      } else {
        copyToClipboard(shareUrl);
      }
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setShareStatus('Copied to clipboard!');
        setTimeout(() => setShareStatus(''), 2000);
      })
      .catch((err) => {
        console.error('Error copying to clipboard:', err);
        setShareStatus('Could not copy to clipboard. Try manually copying the URL.');
      });
  }

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
          isStreaming={chatState.isStreaming()}
          isSharedApp={false}
          shareStatus={shareStatus}
          onShare={handleShare}
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
