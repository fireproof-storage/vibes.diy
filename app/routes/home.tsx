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
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const { database } = useFireproof('fireproof-chat-history');
  const navigate = useNavigate();
  
  // Keep tracking streaming props with refs to avoid re-renders
  const streamingPropsRef = useRef({
    streamingCode: '',
    isStreaming: false,
    currentStreamedText: '',
    messages: [] as any[],
  });

  // Maintain a stable ref to the database to prevent re-renders
  const databaseRef = useRef(database);
  
  // Update database ref when it changes
  useEffect(() => {
    databaseRef.current = database;
  }, [database]);
  
  // Hoist the useChat hook to this component with stable callback reference
  const handleCodeGenerated = useCallback((code: string, dependencies?: Record<string, string>) => {
    setState({
      generatedCode: code,
      dependencies: dependencies || {},
    });
  }, []);
  
  // Handle the generated title callback
  const handleGeneratedTitle = useCallback(async (generatedTitle: string) => {
    // Handle the generated title
    console.log('Title generated:', sessionId, generatedTitle, 'isCreatingSession:', isCreatingSession);

    // Safety check - don't proceed if title is undefined
    if (!generatedTitle) {
      console.warn('Skipping title update - received undefined title');
      return;
    }

    if (sessionId) {
      try {
        // Get the current session document
        const sessionDoc = await databaseRef.current.get(sessionId);
        
        // Validate sessionDoc before updating
        if (!sessionDoc) {
          console.error('Cannot update title: session document is missing');
          return;
        }

        // Create a safe update object without undefined values
        const updatedDoc = {
          ...sessionDoc,
          title: generatedTitle || 'Untitled Chat', // Ensure title is never undefined
        };

        // Save the updated document
        await databaseRef.current.put(updatedDoc);
        console.log('Updated session title to:', generatedTitle);
      } catch (error) {
        console.error('Error updating session title:', error);
      }
    } else {
      // If no sessionId yet, store the title for later use
      setPendingTitle(generatedTitle);
    }
  }, [sessionId, isCreatingSession]);
  
  const chatState = useChat(handleCodeGenerated, handleGeneratedTitle);

  // Only update refs when values actually change with deep equality check
  useEffect(() => {
    const currentProps = {
      streamingCode: chatState.streamingCode,
      isStreaming: chatState.isStreaming,
      currentStreamedText: chatState.currentStreamedText,
      messages: chatState.messages,
    };
    
    // Deep comparison to avoid unnecessary updates
    const hasStreamingChanged = chatState.isStreaming !== streamingPropsRef.current.isStreaming;
    const hasStreamingCodeChanged = chatState.streamingCode !== streamingPropsRef.current.streamingCode;
    const hasCurrentStreamedTextChanged = chatState.currentStreamedText !== streamingPropsRef.current.currentStreamedText;
    const hasMessagesChanged = 
      chatState.messages.length !== streamingPropsRef.current.messages.length ||
      JSON.stringify(chatState.messages) !== JSON.stringify(streamingPropsRef.current.messages);

    // Only update if something changed
    if (hasStreamingChanged || hasStreamingCodeChanged || hasCurrentStreamedTextChanged || hasMessagesChanged) {
      streamingPropsRef.current = currentProps;
    }
  }, [chatState.streamingCode, chatState.isStreaming, chatState.currentStreamedText, chatState.messages]);

  // Apply pending title when sessionId becomes available
  useEffect(() => {
    if (!sessionId || !pendingTitle) return;
    
    // Skip update if we're in the process of creating a session
    if (isCreatingSession) {
      console.log('Session creation in progress, title will be set during creation');
      return;
    }
    
    const updateTitleWhenReady = async () => {
      try {
        // Get the current session document
        const sessionDoc = await databaseRef.current.get(sessionId);
        
        // Create a safe update object without undefined values
        const updatedDoc = {
          ...sessionDoc,
          title: pendingTitle || 'Untitled Chat',
        };

        // Save the updated document
        await databaseRef.current.put(updatedDoc);
        console.log('Successfully updated session title to:', pendingTitle);
        
        // Clear the pending title after successful update
        setPendingTitle(null);
      } catch (error) {
        console.error('Error updating session title:', error);
      }
    };

    updateTitleWhenReady();
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
  const handleSessionCreated = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
    // We don't need to navigate here, as the ChatInterface will do that
  }, []);

  // Handle new chat (reset session)
  const handleNewChat = useCallback(() => {
    setSessionId(null);
    setShareStatus('');
    setState({
      generatedCode: '',
      dependencies: {},
    });
    chatState.setMessages([]);
  }, [chatState]);

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

        const ok = await databaseRef.current.put({
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

  // Memoize dependencies to prevent unnecessary re-renders
  const previewDependencies = useMemo(() => {
    return chatState.parserState?.current?.dependencies || state.dependencies;
  }, [chatState.parserState?.current?.dependencies, state.dependencies]);

  // Memoized ChatInterface component with refined dependencies
  const memoizedChatInterface = useMemo(() => {
    return (
      <ChatProvider
        initialState={{
          input: '',
          isGenerating: false,
          isSidebarVisible: false,
        }}
        onSendMessage={(input) => {
          if (input.trim()) {
            if (!sessionId) {
              // If no session exists, create one
              setIsCreatingSession(true);
              const newSession = {
                timestamp: Date.now(),
                title: input.length > 50 ? `${input.substring(0, 50)}...` : input,
              };

              databaseRef.current.put(newSession).then((doc: { id: string }) => {
                handleSessionCreated(doc.id);
                setIsCreatingSession(false);
              }).catch((err: Error) => {
                console.error('Error creating session:', err);
                setIsCreatingSession(false);
              });
            }
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
    setIsCreatingSession,
    // Avoid including the entire chatState to prevent unnecessary re-renders
    // Only include specific parts that affect the UI
    chatState.sendMessage,
    chatState.isGenerating,
  ]);

  // Memoized ResultPreview component with improved dependency handling
  const memoizedResultPreview = useMemo(() => {
    return (
      <ResultPreview
        code={state.generatedCode}
        streamingCode={streamingPropsRef.current.streamingCode}
        isStreaming={streamingPropsRef.current.isStreaming}
        dependencies={previewDependencies}
        onShare={handleShare}
        shareStatus={shareStatus}
        completedMessage={chatState.completedMessage}
        currentStreamContent={streamingPropsRef.current.currentStreamedText}
        currentMessage={
          streamingPropsRef.current.messages.length > 0
            ? { content: streamingPropsRef.current.messages[streamingPropsRef.current.messages.length - 1].text }
            : undefined
        }
        onScreenshotCaptured={handleScreenshotCaptured}
        {...(sessionId ? { sessionId } : {})}
      />
    );
  }, [
    state.generatedCode,
    previewDependencies,
    sessionId,
    shareStatus,
    handleShare,
    handleScreenshotCaptured,
    chatState.completedMessage,
    // Removed streaming-related props since we use the ref versions
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
