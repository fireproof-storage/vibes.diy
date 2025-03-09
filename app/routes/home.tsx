import { useEffect, useState, useCallback } from 'react';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../ResultPreview';
import { useChat } from '../hooks/useChat';
import { useFireproof } from 'use-fireproof';

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

  // Hoist the useChat hook to this component
  const chatState = useChat((code: string, dependencies?: Record<string, string>) => {
    setState({
      generatedCode: code,
      dependencies: dependencies || {},
    });
  });

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
  const handleSessionCreated = (newSessionId: string) => {
    setSessionId(newSessionId);
    console.log('New session created:', newSessionId);
  };

  // Handle new chat (reset session)
  const handleNewChat = () => {
    setSessionId(null);
    setState({ generatedCode: '', dependencies: {} });
    chatState.setMessages([]);
  };

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
        console.log(
          `Saving screenshot to session: ${sessionId}, screenshot length: ${screenshotData.length}`
        );

        const response = await fetch(screenshotData);
        const blob = await response.blob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        const ok = await database.put({
          type: 'screenshot',
          session_id: sessionId,
          _files: {
            screenshot: file,
          },
        });
        console.log('ok', ok);
      }
    },
    [sessionId]
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 33.333%', overflow: 'hidden', position: 'relative' }}>
        <ChatInterface
          chatState={chatState}
          sessionId={sessionId}
          onSessionCreated={handleSessionCreated}
          onNewChat={handleNewChat}
          onCodeGenerated={(code, dependencies) => {
            setState({
              generatedCode: code,
              dependencies: dependencies || {},
            });
          }}
        />
      </div>
      <div style={{ flex: '0 0 66.667%', overflow: 'hidden', position: 'relative' }}>
        <ResultPreview
          code={state.generatedCode}
          streamingCode={chatState.streamingCode}
          isStreaming={chatState.isStreaming}
          dependencies={chatState.parserState?.current?.dependencies || state.dependencies}
          onShare={handleShare}
          shareStatus={shareStatus}
          completedMessage={chatState.completedMessage}
          currentStreamContent={chatState.currentStreamedText}
          currentMessage={
            chatState.messages.length > 0
              ? { content: chatState.messages[chatState.messages.length - 1].text }
              : undefined
          }
          onScreenshotCaptured={handleScreenshotCaptured}
        />
      </div>
    </div>
  );
}
