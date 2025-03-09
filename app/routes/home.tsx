import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import { useChat } from '../hooks/useChat';
import { useFireproof } from 'use-fireproof';
import { ChatProvider } from '../context/ChatContext';

// Add helper for debugging
const DEBUG = true;
const debugLog = (...args: any[]) => DEBUG && console.log('[DEBUG Home]', ...args);

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
  // Add render counter for debugging
  const renderCount = useMemo(() => ({ count: 0 }), []);
  renderCount.count++;
  debugLog(`Home component render #${renderCount.count}`);
  
  // Track previous state to determine what triggered rerender
  const prevStateRef = useRef<{
    chatState: {
      streamingCode: string;
      isStreaming: boolean;
      currentStreamedText: string;
      messages: any[];
    };
    state: {
      generatedCode: string;
      dependencies: Record<string, string>;
    };
    sessionId: string | null;
    shareStatus: string;
  }>({
    chatState: {
      streamingCode: '',
      isStreaming: false,
      currentStreamedText: '',
      messages: []
    },
    state: {
      generatedCode: '',
      dependencies: {}
    },
    sessionId: null,
    shareStatus: ''
  });
  
  useEffect(() => {
    // Compare current state with previous to identify what changed
    const changes = [];
    
    if (chatState.streamingCode !== prevStateRef.current.chatState.streamingCode) {
      changes.push('streamingCode');
    }
    if (chatState.isStreaming !== prevStateRef.current.chatState.isStreaming) {
      changes.push('isStreaming');
    }
    if (chatState.currentStreamedText !== prevStateRef.current.chatState.currentStreamedText) {
      changes.push('currentStreamedText');
    }
    if (chatState.messages.length !== prevStateRef.current.chatState.messages.length) {
      changes.push('messages');
    }
    if (state.generatedCode !== prevStateRef.current.state.generatedCode) {
      changes.push('generatedCode');
    }
    if (sessionId !== prevStateRef.current.sessionId) {
      changes.push('sessionId');
    }
    if (shareStatus !== prevStateRef.current.shareStatus) {
      changes.push('shareStatus');
    }
    
    if (changes.length > 0) {
      debugLog('Home rerender caused by changes in:', changes.join(', '));
    }
    
    // Update prev state ref
    prevStateRef.current = {
      chatState: {
        streamingCode: chatState.streamingCode,
        isStreaming: chatState.isStreaming,
        currentStreamedText: chatState.currentStreamedText,
        messages: chatState.messages
      },
      state: {
        generatedCode: state.generatedCode,
        dependencies: state.dependencies
      },
      sessionId,
      shareStatus
    };
  });

  const [state, setState] = useState({
    generatedCode: '',
    dependencies: {} as Record<string, string>,
  });
  const [shareStatus, setShareStatus] = useState<string>('');
  const [isSharedApp, setIsSharedApp] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { database } = useFireproof('fireproof-chat-history');
  const navigate = useNavigate();

  // Hoist the useChat hook to this component
  const chatState = useChat(
    (code: string, dependencies?: Record<string, string>) => {
      setState({
        generatedCode: code,
        dependencies: dependencies || {},
      });
    },
    async (generatedTitle: string) => {
      // Handle the generated title
      console.log('Title generated:', generatedTitle);
      
      // If we have a session ID, update the title in the database
      if (sessionId) {
        try {
          // Get the current session document
          const sessionDoc = await database.get(sessionId);
          
          // Update the title
          const updatedDoc = {
            ...sessionDoc,
            title: generatedTitle
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

  // Handle new session creation - memoize to prevent rerenders
  const handleSessionCreated = useCallback((newSessionId: string) => {
    debugLog('handleSessionCreated called with', newSessionId);
    setSessionId(newSessionId);
    // We don't need to navigate here, as the ChatInterface will do that
  }, []);

  // Handle new chat (reset session) - memoize to prevent rerenders
  const handleNewChat = useCallback(() => {
    debugLog('handleNewChat called');
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

  // Memoize onCodeGenerated callback
  const handleCodeGenerated = useCallback((code: string, dependencies: Record<string, string> = {}) => {
    debugLog('handleCodeGenerated called, code length:', code.length);
    setState({
      generatedCode: code,
      dependencies: dependencies || {},
    });
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
        setTimeout(() => setShareStatus(''), 3000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        // Further fallback - show the URL to manually copy
        prompt('Copy this link to share your app:', text);
      });
  }

  // Memoize the screenshot handler
  const handleScreenshotCaptured = useCallback(async (screenshotData: string) => {
    debugLog('Screenshot captured, length:', screenshotData?.length || 0);
    
    if (sessionId) {
      debugLog(`Saving screenshot to session: ${sessionId}`);

      try {
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
        debugLog('Screenshot saved:', ok);
      } catch (error) {
        debugLog('Error saving screenshot:', error);
      }
    }
  }, [sessionId, database]);

  // Memoize dependencies to prevent unnecessary re-renders
  const previewDependencies = useMemo(() => {
    return chatState.parserState?.current?.dependencies || state.dependencies;
  }, [chatState.parserState?.current?.dependencies, state.dependencies]);

  // Add after the existing render counter
  const streamingPropsRef = useRef({
    streamingCode: '',
    isStreaming: false,
    currentStreamedText: '',
    messages: [] as any[]
  });
  
  // Update the ref with current values from chatState when they change
  useEffect(() => {
    const hasStreamingChanged = chatState.isStreaming !== streamingPropsRef.current.isStreaming;
    const hasStreamingCodeChanged = chatState.streamingCode !== streamingPropsRef.current.streamingCode;
    const hasCurrentStreamedTextChanged = chatState.currentStreamedText !== streamingPropsRef.current.currentStreamedText;
    const hasMessagesChanged = chatState.messages.length !== streamingPropsRef.current.messages.length;
    
    if (hasStreamingChanged) debugLog('isStreaming changed to', chatState.isStreaming);
    if (hasStreamingCodeChanged) debugLog('streamingCode length changed to', chatState.streamingCode.length);
    if (hasCurrentStreamedTextChanged) debugLog('currentStreamedText length changed to', chatState.currentStreamedText.length);
    if (hasMessagesChanged) debugLog('messages count changed to', chatState.messages.length);
    
    // Only update if something changed
    if (hasStreamingChanged || hasStreamingCodeChanged || hasCurrentStreamedTextChanged || hasMessagesChanged) {
      streamingPropsRef.current = {
        streamingCode: chatState.streamingCode,
        isStreaming: chatState.isStreaming,
        currentStreamedText: chatState.currentStreamedText,
        messages: chatState.messages
      };
    }
  }, [
    chatState.streamingCode, 
    chatState.isStreaming, 
    chatState.currentStreamedText,
    chatState.messages
  ]);

  // Memoize the ChatInterface component to prevent rerenders during streaming
  const memoizedChatInterface = useMemo(() => {
    debugLog('Creating memoized ChatInterface');
    
    return (
      <ChatProvider
        initialState={{
          input: chatState.input,
          isGenerating: chatState.isGenerating,
          isSidebarVisible: false,
        }}
        onSendMessage={(input) => {
          debugLog('ChatProvider.onSendMessage called with:', input);
          
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
    // Include these critical dependencies
    sessionId,
    handleSessionCreated,
    handleNewChat,
    handleCodeGenerated,
    database,
    // Include these input-related dependencies
    chatState.setInput,
    chatState.sendMessage,
    // Don't include the streaming-related props from chatState
    // that change frequently during streaming
  ]);

  // Create a memoized ResultPreview component
  const memoizedResultPreview = useMemo(() => {
    debugLog('Creating memoized ResultPreview');
    return (
      <ResultPreview
        code={state.generatedCode}
        dependencies={previewDependencies}
        // Pass streaming props indirectly through the ref
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
    handleScreenshotCaptured
    // Exclude all streaming-related props completely since ResultPreview has internal state for these
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
