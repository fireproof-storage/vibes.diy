import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import { useFireproof } from 'use-fireproof';
import type { ChatMessage, AiChatMessage, Segment, SessionDocument } from '../types/chat';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { parseContent, parseDependencies } from '../utils/segmentParser';
import { ChatProvider } from '../context/ChatContext';

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
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const { database } = useFireproof('fireproof-chat-history');
  const navigate = useNavigate();

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

  // Helper function to clear messages
  const clearMessages = useCallback(() => {
    chatState.setMessages([]);
  }, [chatState]);

  // Helper function to update session title
  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      // Get the current session document
      const sessionDoc = await databaseRef.current.get(sessionId) as SessionDocument;

      // Create a safe update object without undefined values
      const updatedDoc = {
        ...sessionDoc,
        title: title || 'Untitled Chat',
      };

      // Save the updated document
      await databaseRef.current.put(updatedDoc);
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

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

  // Handle title generation with stable callback reference
  const handleGeneratedTitle = useCallback(
    (generatedTitle: string) => {
      // If we already have a sessionId, update the title directly
      if (sessionId && !isCreatingSession) {
        updateSessionTitle(sessionId, generatedTitle);
      } else {
        // Otherwise, store it for when the session is created
        setPendingTitle(generatedTitle);
      }
    },
    [sessionId, isCreatingSession]
  );

  // Effect to handle title update when title changes
  useEffect(() => {
    if (chatState.title && chatState.title !== 'New Chat') {
      handleGeneratedTitle(chatState.title);
    }
  }, [chatState.title, handleGeneratedTitle]);

  // Apply pending title when sessionId becomes available
  useEffect(() => {
    if (!sessionId || !pendingTitle) return;

    // Skip update if we're in the process of creating a session
    if (isCreatingSession) {
      return;
    }

    updateSessionTitle(sessionId, pendingTitle);
    setPendingTitle(null);
  }, [sessionId, pendingTitle, isCreatingSession]);

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

  // Handle new session creation
  const handleNewChat = useCallback(() => {
    setSessionId(null);
    setShareStatus('');
    setState({
      generatedCode: '',
      dependencies: {},
    });
    clearMessages();
  }, [clearMessages]);

  // Handle session creation
  const handleSessionCreated = useCallback(
    (newSessionId: string) => {
      if (newSessionId) {
        setSessionId(newSessionId);
        setIsCreatingSession(false);

        // If we have a pending title from an AI response, set it now
        if (pendingTitle) {
          updateSessionTitle(newSessionId, pendingTitle);
          setPendingTitle(null);
        }
      }
    },
    [pendingTitle]
  );

  // Handle sending messages with the ChatProvider
  const handleSendMessage = useCallback(() => {
    if (chatState.input.trim()) {
      chatState.sendMessage();
    }
  }, [chatState]);

  // Handle new chat with the ChatProvider
  const handleStartNewChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

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
        setTimeout(() => setShareStatus(''), 3000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        // Further fallback - show the URL to manually copy
        prompt('Copy this link to share your app:', text);
      });
  }

  // Add screenshot handling in home.tsx
  const handleScreenshotCaptured = useCallback(
    async (screenshotData: string) => {
      if (sessionId) {
        const response = await fetch(screenshotData);
        const blob = await response.blob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        await databaseRef.current.put({
          type: 'screenshot',
          session_id: sessionId,
          _files: {
            screenshot: file,
          },
        });
      }
    },
    [sessionId]
  );

  // Memoize dependencies to prevent unnecessary re-renders
  const previewDependencies = useMemo(() => {
    return getDependencies() || state.dependencies;
  }, [getDependencies, state.dependencies]);

  // Memoized ResultPreview component with improved dependency handling
  const memoizedResultPreview = useMemo(() => {
    const lastAiMessage = [...chatState.messages].reverse().find(
      (msg): msg is AiChatMessage => msg.type === 'ai'
    );
    return (
      <ResultPreview
        code={state.generatedCode}
        streamingCode={chatState.getCurrentCode()}
        isStreaming={chatState.messages.length > 0 && chatState.isGenerating}
        dependencies={previewDependencies}
        onShare={handleShare}
        shareStatus={shareStatus}
        completedMessage={lastAiMessage?.text || ''}
        currentStreamContent={chatState.currentSegments()
          .filter((seg: Segment) => seg.type === 'markdown')
          .map((seg: Segment) => seg.content)
          .join('')}
        currentMessage={
          chatState.messages.length > 0
            ? { content: chatState.messages[chatState.messages.length - 1].text }
            : undefined
        }
        onScreenshotCaptured={handleScreenshotCaptured}
      />
    );
  }, [
    state.generatedCode,
    previewDependencies,
    sessionId,
    shareStatus,
    handleShare,
    handleScreenshotCaptured,
    chatState.isGenerating,
    chatState.messages,
    chatState.currentSegments,
    chatState.getCurrentCode,
  ]);

  return (
    <ChatProvider
      initialState={{
        input: chatState.input,
        isGenerating: chatState.isGenerating,
      }}
      onSendMessage={handleSendMessage}
      onNewChat={handleStartNewChat}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex h-full flex-1 overflow-hidden">
          <div className="flex h-full w-1/2 flex-col overflow-hidden">
            <ChatInterface
              chatState={chatState}
              sessionId={sessionId}
              onSessionCreated={handleSessionCreated}
              onNewChat={handleNewChat}
            />
          </div>
          <div className="h-full w-1/2">
            {memoizedResultPreview}
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}
