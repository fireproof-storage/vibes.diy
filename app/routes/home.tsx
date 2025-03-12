import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import { useFireproof } from 'use-fireproof';
import type { ChatMessage, AiChatMessage, Segment, SessionDocument } from '../types/chat';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import AppLayout from '../components/AppLayout';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';

export function meta() {
  return [
    { title: 'Fireproof App Builder' },
    { name: 'description', content: 'Build React components with AI' },
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

function decodeStateFromUrl(encoded: string) {
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const stateObj = JSON.parse(jsonStr);
    return {
      code: stateObj.code || '',
      dependencies: stateObj.dependencies || {},
    };
  } catch (error) {
    console.error('Error decoding state from URL:', error);
    return { code: '', dependencies: {} };
  }
}

export default function Home() {
  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });
  const [shareStatus, setShareStatus] = useState<string>('');
  const [isSharedApp, setIsSharedApp] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Use the simple chat hook with sessionId
  const chatState = useSimpleChat(sessionId);

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

  // Update handleCodeGenerated to work with the new hook
  const handleCodeGenerated = useCallback(
    (code: string, dependencies: Record<string, string> = {}) => {
      setState({
        generatedCode: code,
        dependencies: dependencies || {},
      });
    },
    [setState]
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

  // Handle new session creation (for navigation)
  const handleSessionCreated = useCallback(
    (newSessionId: string) => {
      if (newSessionId) {
        // Navigate to the session page
        navigate(`/session/${newSessionId}`);
      }
    },
    [navigate]
  );

  // Check for state in URL on component mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash?.startsWith('#state=')) {
      const encodedState = hash.substring(7); // Remove '#state='
      const decodedState = decodeStateFromUrl(encodedState);
      if (decodedState.code) {
        setState({
          generatedCode: decodedState.code,
          dependencies: decodedState.dependencies,
        });
        setIsSharedApp(true);
      }
    }
  }, []);

  function handleShare() {
    if (!state.generatedCode) {
      alert('Generate an app first before sharing!');
      return;
    }

    const encoded = encodeStateToUrl(state.generatedCode, state.dependencies);
    if (encoded) {
      const shareUrl = `${window.location.origin}${window.location.pathname}#state=${encoded}`;

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

  // Handle the case where a new session has been created
  useEffect(() => {
    if (sessionId && chatState.messages.length > 0) {
      // Navigate to the new session page
      navigate(`/session/${sessionId}`);
    }
  }, [sessionId, chatState.messages.length, navigate]);

  return (
    <AppLayout
      chatPanel={
        <ChatInterface
          chatState={chatState}
          sessionId={null}
          onSessionCreated={handleSessionCreated}
        />
      }
      previewPanel={
        <ResultPreview
          code={state.generatedCode}
          dependencies={state.dependencies}
          streamingCode={chatState.getCurrentCode()}
          isStreaming={chatState.isStreaming()}
          isSharedApp={isSharedApp}
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
