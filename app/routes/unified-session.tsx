import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import type { ChatMessage, AiChatMessage, Segment, SessionDocument } from '../types/chat';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import AppLayout from '../components/AppLayout';
import { FIREPROOF_CHAT_HISTORY } from '../config/env';
import { useSession } from '../hooks/useSession';

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

export default function UnifiedSession() {
  // Get sessionId from URL params if it exists
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Track whether we're in a shared app context
  const [isSharedApp, setIsSharedApp] = useState<boolean>(false);

  // State for current session
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId || null);
  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });
  const [shareStatus, setShareStatus] = useState<string>('');
  const sessionCreationAttemptedRef = useRef(false);

  // Initialize session management hook with current sessionId
  const { createSession, session } = useSession(sessionId);

  // Use the simple chat hook with current sessionId
  const chatState = useSimpleChat(sessionId);

  // Log state for debugging
  console.log('UnifiedSession: initialized with sessionId:', sessionId);
  console.log('UnifiedSession: chatState has messages:', chatState.messages.length);
  console.log('UnifiedSession: isStreaming:', chatState.streamingState);

  // Check if there's a state parameter in the URL (for shared apps)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const encodedState = searchParams.get('state');

    if (encodedState) {
      const decodedState = decodeStateFromUrl(encodedState);
      if (decodedState.code) {
        setState({
          generatedCode: decodedState.code,
          dependencies: decodedState.dependencies,
        });
        setIsSharedApp(true);
      }
    }
  }, [location.search]);

  // Create a new session when loaded without sessionId
  useEffect(() => {
    if (!urlSessionId && !sessionCreationAttemptedRef.current) {
      console.log('UnifiedSession: No sessionId in URL, but NOT creating new session yet');
      sessionCreationAttemptedRef.current = true;

      // We'll create a session only when the user sends their first message
      // This prevents immediate redirect from the root path
    }
  }, [urlSessionId, createSession, navigate]);

  // Helper function to extract dependencies from segments
  const getDependencies = useCallback(() => {
    const lastAiMessage = [...chatState.messages]
      .reverse()
      .find((msg): msg is AiChatMessage => msg.type === 'ai');

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
    // Find the last AI message that is not streaming
    const lastAiMessage = [...chatState.messages]
      .reverse()
      .find((msg) => msg.type === 'ai' && !msg.isStreaming);

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

  // Handle session creation
  const handleSessionCreated = useCallback(
    (newSessionId: string) => {
      setSessionId(newSessionId);
      // Update URL without full page reload
      navigate(`/session/${newSessionId}`, { replace: true });
    },
    [navigate]
  );

  // Handle new chat creation
  const handleNewChat = useCallback(() => {
    // Reset session creation flag
    sessionCreationAttemptedRef.current = false;

    // Navigate to home to create a new session
    navigate('/', { replace: true });

    // Reset state
    setSessionId(null);
    setState({
      generatedCode: '',
      dependencies: {},
    });
    setShareStatus('');
    setIsSharedApp(false);
  }, [navigate]);

  // Handle sharing functionality
  function handleShare() {
    if (!state.generatedCode) {
      alert('Generate an app first before sharing!');
      return;
    }

    const encoded = encodeStateToUrl(state.generatedCode, state.dependencies);
    if (encoded) {
      // Create a sharable URL with the encoded state
      const shareUrl = `${window.location.origin}/shared?state=${encoded}`;

      copyToClipboard(shareUrl);
      setShareStatus('Share URL copied to clipboard!');

      // Reset status after a brief delay
      setTimeout(() => {
        setShareStatus('');
      }, 3000);
    }
  }

  // Copy text to clipboard
  function copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log('Text copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err);
        });
    } else {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('Fallback: Could not copy text: ', err);
      }
    }
  }

  return (
    <AppLayout
      chatPanel={
        <ChatInterface
          chatState={chatState}
          sessionId={sessionId}
          onSessionCreated={handleSessionCreated}
          onNewChat={handleNewChat}
        />
      }
      previewPanel={
        <ResultPreview
          code={state.generatedCode}
          dependencies={state.dependencies}
          streamingCode={chatState.getCurrentCode()}
          isSharedApp={isSharedApp}
          shareStatus={shareStatus}
          onShare={handleShare}
          completedMessage={
            chatState.messages.length > 0
              ? chatState.messages.filter((msg) => msg.type === 'ai').pop()?.text || ''
              : ''
          }
          currentStreamContent={chatState
            .currentSegments()
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
