import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import { useChat } from '../hooks/useChat';
import { useFireproof } from 'use-fireproof';
import { ChatProvider } from '../context/ChatContext';
import { useSimpleChat } from '~/hooks/useSimpleChat';
import type { Segment } from '~/types/chat';

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
    messages: [] as ChatMessage[],
    currentCode: '',
    currentSegments: [] as Segment[],
  });

  // Maintain a stable ref to the database to prevent re-renders
  const databaseRef = useRef(database);

  // Update database ref when it changes
  useEffect(() => {
    databaseRef.current = database;
  }, [database]);

  // Initialize the chat state
  const chatState = useSimpleChat();

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

  // Setup effect to trigger handleCodeGenerated when a message with code is completed
  useEffect(() => {
    // Find the last AI message
    const lastAiMessage = [...chatState.messages].reverse().find(
      (msg) => msg.type === 'ai' && !msg.isStreaming
    );
    
    // If we found a completed AI message with code, trigger the handler
    if (lastAiMessage && lastAiMessage.type === 'ai') {
      const code = chatState.getCurrentCode();
      if (code) {
        // Get dependencies from the AI message
        const dependencies = lastAiMessage.dependenciesString 
          ? JSON.parse(lastAiMessage.dependenciesString.replace(/}}$/, '}'))
          : {};
        handleCodeGenerated(code, dependencies);
      }
    }
  }, [chatState.messages, chatState.getCurrentCode, handleCodeGenerated]);

  // Setup effect to handle title generation
  useEffect(() => {
    if (chatState.title && chatState.title !== 'New Chat') {
      handleGeneratedTitle(chatState.title);
    }
  }, [chatState.title, handleGeneratedTitle]);

  // Handle the generated title callback
  const handleGeneratedTitle = useCallback(
    async (generatedTitle: string) => {
      // Handle the generated title

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
        } catch (error) {
          console.error('Error updating session title:', error);
        }
      } else {
        // If no sessionId yet, store the title for later use
        setPendingTitle(generatedTitle);
      }
    },
    [sessionId, isCreatingSession]
  );

  // Update streamingPropsRef to match the new API
  useEffect(() => {
    const currentProps = {
      messages: chatState.messages,
      currentCode: chatState.getCurrentCode(),
      currentSegments: chatState.currentSegments(),
    };

    // Deep comparison to avoid unnecessary updates
    const hasMessagesChanged =
      chatState.messages.length !== streamingPropsRef.current.messages?.length ||
      JSON.stringify(chatState.messages) !== JSON.stringify(streamingPropsRef.current.messages || []);
    
    const hasCodeChanged = 
      currentProps.currentCode !== streamingPropsRef.current.currentCode;

    // Only update the ref if something relevant has changed
    if (hasMessagesChanged || hasCodeChanged) {
      streamingPropsRef.current = currentProps;
    }
  }, [chatState.messages, chatState.getCurrentCode, chatState.currentSegments]);

  // Apply pending title when sessionId becomes available
  useEffect(() => {
    if (!sessionId || !pendingTitle) return;

    // Skip update if we're in the process of creating a session
    if (isCreatingSession) {
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

              databaseRef.current
                .put(newSession)
                .then((doc: { id: string }) => {
                  handleSessionCreated(doc.id);
                  setIsCreatingSession(false);
                })
                .catch((err: Error) => {
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
          onNewChat={handleNewChat}
          onSessionCreated={handleSessionCreated}
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
    const lastAiMessage = [...chatState.messages].reverse().find(
      (msg) => msg.type === 'ai' && !msg.isStreaming
    );
    return (
      <ResultPreview
        code={state.generatedCode}
        streamingCode={streamingPropsRef.current.currentCode}
        isStreaming={streamingPropsRef.current.messages.length > 0 && chatState.isGenerating}
        dependencies={previewDependencies}
        onShare={handleShare}
        shareStatus={shareStatus}
        completedMessage={lastAiMessage?.text || ''}
        currentStreamContent={streamingPropsRef.current.currentSegments
          .filter(seg => seg.type === 'markdown')
          .map(seg => seg.content)
          .join('')}
        currentMessage={
          streamingPropsRef.current.messages.length > 0
            ? streamingPropsRef.current.messages[streamingPropsRef.current.messages.length - 1]
            : undefined
        }
        shareUrl={state.shareUrl}
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
