import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import { useChat } from '../hooks/useChat';
import { useFireproof } from 'use-fireproof';
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
  const { database } = useFireproof('fireproof-chat-history');
  const navigate = useNavigate();

  const chatState = useChat(
    (code: string, dependencies?: Record<string, string>) => {
      setState({
        generatedCode: code,
        dependencies: dependencies || {},
      });
    },
    async (generatedTitle: string) => {
      // Handle the generated title
      console.log('Title generated:', sessionId, generatedTitle);

      // If we have a session ID, update the title in the database
      if (sessionId) {
        try {
          // Get the current session document
          const sessionDoc = await database.get(sessionId);

          // Update the title
          const updatedDoc = {
            ...sessionDoc,
            title: generatedTitle,
          };

          // Save the updated document
          await database.put(updatedDoc);
          console.log('Updated session title to:', generatedTitle);
        } catch (error) {
          console.error('Error updating session title:', error);
        }
      }
    }
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

  const handleSessionCreated = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
    // We don't need to navigate here, as the ChatInterface will do that
  }, []);

  const handleNewChat = useCallback(() => {
    setSessionId(null);
    setShareStatus('');
    setState({
      generatedCode: '',
      dependencies: {},
    });
    chatState.setMessages([]);
    // navigate to the home page
    navigate('/');
  }, [navigate, chatState.setMessages]);

  const handleCodeGenerated = useCallback(
    (code: string, dependencies: Record<string, string> = {}) => {
      setState({
        generatedCode: code,
        dependencies: dependencies || {},
      });
    },
    []
  );

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

  const handleScreenshotCaptured = useCallback(
    async (screenshotData: string) => {
      if (sessionId) {
        try {
          const response = await fetch(screenshotData);
          const blob = await response.blob();
          const file = new File([blob], 'screenshot.png', { type: 'image/png' });

          await database.put({
            type: 'screenshot',
            session_id: sessionId,
            _files: {
              screenshot: file,
            },
          });
        } catch (error) {
          console.error('Error saving screenshot:', error);
        }
      }
    },
    [sessionId, database]
  );

  // Memoize dependencies to prevent unnecessary re-renders
  const previewDependencies = useMemo(() => {
    return chatState.parserState?.current?.dependencies || state.dependencies;
  }, [chatState.parserState?.current?.dependencies, state.dependencies]);

  // Keep tracking streaming props with refs but remove debug logs
  const streamingPropsRef = useRef({
    streamingCode: '',
    isStreaming: false,
    currentStreamedText: '',
    messages: [] as any[],
  });

  // Keep this effect but remove debug logs
  useEffect(() => {
    const hasStreamingChanged = chatState.isStreaming !== streamingPropsRef.current.isStreaming;
    const hasStreamingCodeChanged =
      chatState.streamingCode !== streamingPropsRef.current.streamingCode;
    const hasCurrentStreamedTextChanged =
      chatState.currentStreamedText !== streamingPropsRef.current.currentStreamedText;
    const hasMessagesChanged =
      chatState.messages.length !== streamingPropsRef.current.messages.length;

    // Only update if something changed
    if (
      hasStreamingChanged ||
      hasStreamingCodeChanged ||
      hasCurrentStreamedTextChanged ||
      hasMessagesChanged
    ) {
      streamingPropsRef.current = {
        streamingCode: chatState.streamingCode,
        isStreaming: chatState.isStreaming,
        currentStreamedText: chatState.currentStreamedText,
        messages: chatState.messages,
      };
    }
  }, [
    chatState.streamingCode,
    chatState.isStreaming,
    chatState.currentStreamedText,
    chatState.messages,
  ]);

  // Keep the memoized ChatInterface but remove debug logs
  const memoizedChatInterface = useMemo(() => {
    return (
      <ChatProvider
        initialState={{
          input: chatState.input,
          isGenerating: chatState.isGenerating,
          isSidebarVisible: false,
        }}
        onSendMessage={(input) => {
          if (input.trim()) {
            if (!sessionId) {
              // If no session exists, create one
              const newSession = {
                timestamp: Date.now(),
                title: input.length > 50 ? `${input.substring(0, 50)}...` : input,
              };

              database.put(newSession).then((doc) => {
                handleSessionCreated(doc.id);
              });
            }

            // Set the input directly on chatState
            chatState.setInput(input);

            // Wait a tick to ensure input is set
            setTimeout(() => {
              chatState.sendMessage();
            }, 10);
          }
        }}
        onNewChat={handleNewChat}
      >
        <ChatInterface
          chatState={chatState}
          sessionId={sessionId}
          onSessionCreated={handleSessionCreated}
          onNewChat={handleNewChat}
          onCodeGenerated={handleCodeGenerated}
        />
      </ChatProvider>
    );
  }, [
    sessionId,
    handleSessionCreated,
    handleNewChat,
    handleCodeGenerated,
    database,
    chatState.setInput,
    chatState.sendMessage,
  ]);

  // Keep the memoized ResultPreview but remove debug logs
  const memoizedResultPreview = useMemo(() => {
    return (
      <ResultPreview
        code={state.generatedCode}
        dependencies={previewDependencies}
        streamingCode={chatState.streamingCode}
        isStreaming={chatState.isStreaming}
        completedMessage={chatState.completedMessage}
        currentStreamContent={chatState.currentStreamedText}
        currentMessage={
          chatState.messages.length > 0
            ? { content: chatState.messages[chatState.messages.length - 1].text }
            : undefined
        }
        initialView={isSharedApp ? 'preview' : 'code'}
        shareStatus={shareStatus}
        onShare={handleShare}
        onScreenshotCaptured={handleScreenshotCaptured}
        sessionId={sessionId || undefined}
      />
    );
  }, [
    state.generatedCode,
    previewDependencies,
    sessionId,
    isSharedApp,
    shareStatus,
    handleShare,
    handleScreenshotCaptured,
    // Exclude streaming-related props since ResultPreview has internal state for these
  ]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh)' }}>
      <div style={{ flex: '0 0 33.333%', overflow: 'hidden', position: 'relative' }}>
        {memoizedChatInterface}
      </div>
      <div style={{ flex: '0 0 66.667%', overflow: 'hidden', position: 'relative' }}>
        {memoizedResultPreview}
      </div>
    </div>
  );
}
