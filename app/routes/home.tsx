import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useCookieConsent } from '../context/CookieConsentContext';
import { ViewStateProvider, useSharedViewState } from '../context/ViewStateContext';
import { encodeTitle } from '~/components/SessionSidebar/utils';
import AppLayout from '../components/AppLayout';
import ChatHeaderContent from '../components/ChatHeaderContent';
import ChatInput from '../components/ChatInput';
import ChatInterface from '../components/ChatInterface';
import QuickSuggestions from '../components/QuickSuggestions';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import ResultPreviewHeaderContent from '../components/ResultPreview/ResultPreviewHeaderContent';
import SessionSidebar from '../components/SessionSidebar';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { decodeStateFromUrl } from '../utils/sharing';
import { isMobileViewport } from '../utils/ViewState';
// import { useSession } from '../hooks/useSession';

export function meta() {
  return [
    { title: 'Vibes DIY - AI App Builder' },
    { name: 'description', content: 'Generate apps in one prompt' },
  ];
}

function SessionContent() {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const chatState = useSimpleChat(urlSessionId);
  const { setMessageHasBeenSent } = useCookieConsent();

  // State for view management - set initial view based on URL path
  const [activeView, setActiveView] = useState<'code' | 'preview' | 'data'>(() => {
    // Directly check the pathname on initial render
    // Add null check for location to prevent errors in tests
    const path = location?.pathname || '';
    if (path.endsWith('/app')) {
      return 'preview';
    } else if (path.endsWith('/code')) {
      return 'code';
    } else if (path.endsWith('/data')) {
      return 'data';
    }
    // Default to code view if no suffix is found
    return 'code';
  });
  const [previewReady, setPreviewReady] = useState(false);
  // const [bundlingComplete] = useState(true);
  const [mobilePreviewShown, setMobilePreviewShown] = useState(false);
  const [isIframeFetching, setIsIframeFetching] = useState(false);

  // Add a ref to track whether streaming was active previously
  const wasStreamingRef = useRef(false);

  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // For backwards compatibility with components that expect setActiveView
  const [activeView, setActiveView] = useState<'code' | 'preview' | 'data'>('code');

  // Consume the shared view state from the context
  const { currentView, mobilePreviewShown, setMobilePreviewShown, isIframeFetching } =
    useSharedViewState();

  // For backwards compatibility, sync ViewState with local state
  // This allows us to gradually migrate components to use ViewState directly
  useEffect(() => {
    setActiveView(currentView);
  }, [currentView, setActiveView]);

  // Directly create an openSidebar function
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  // Add closeSidebar function
  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Reset previewReady state when streaming starts
  useEffect(() => {
    if (chatState.isStreaming) {
      setPreviewReady(false);
    }
  }, [chatState.isStreaming]);

  // Handle preview loaded event
  const handlePreviewLoaded = useCallback(() => {
    setPreviewReady(true);

    // Don't automatically show preview on mobile until streaming is complete
    // and only do this on mobile devices
    if (!chatState.isStreaming && isMobileViewport()) {
      setMobilePreviewShown(true);
    }

    // Update the active view locally, but don't force navigation
    // Let the user stay on their current tab
    setActiveView('preview');
  }, []);

  useEffect(() => {
    if (chatState.title) {
      // Check if the current path has a tab suffix
      // Add null check for location to prevent errors in tests
      const currentPath = location?.pathname || '';
      let suffix = '';

      // Preserve the tab suffix when updating the URL
      if (currentPath.endsWith('/app')) {
        suffix = '/app';
      } else if (currentPath.endsWith('/code')) {
        suffix = '/code';
      } else if (currentPath.endsWith('/data')) {
        suffix = '/data';
      } else if (currentPath.includes(`/chat/${chatState.sessionId}`)) {
        // If it's the base chat URL without suffix, default to /app
        suffix = '/app';
      }

      const newUrl = `/chat/${chatState.sessionId}/${encodeTitle(chatState.title)}${suffix}`;

      if (location && newUrl !== location.pathname) {
        navigate(newUrl, { replace: true });
      }
    }
  }, [chatState.title, location?.pathname, chatState.sessionId, navigate]);

  // Check if there's a state parameter in the URL (for shared apps)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const stateParam = searchParams.get('state');
    if (stateParam) {
      try {
        const decodedState = decodeStateFromUrl(stateParam);
        if (decodedState && decodedState.code) {
          // Handle the shared app state
          // Since we can't directly set the code, we need to create a new message
          // that contains the shared code, which will trigger the chat state to update

          // We can use the setSelectedResponseId method to select the response
          // once it's created, but we don't have direct access to create a new message
          // with the shared code

          // For now, just log that we received shared state
          console.log('Received shared app state:', decodedState);

          // Remove the state parameter from the URL
          const newUrl = location.pathname;
          navigate(newUrl, { replace: true });
        }
      } catch (e) {
        console.error('Error decoding state parameter:', e);
      }
    }
  }, [location.search, navigate, chatState]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      chatState.setInput(e.target.value);
    },
    [chatState]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!chatState.isStreaming && chatState.input.trim()) {
          chatState.sendMessage();
          setMessageHasBeenSent(true);
        }
      }
    },
    [chatState, setMessageHasBeenSent]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      chatState.setInput(suggestion);
      chatState.sendMessage();
      setMessageHasBeenSent(true);
    },
    [chatState, setMessageHasBeenSent]
  );

  // Track if user manually clicked back to chat during streaming
  const [userClickedBack, setUserClickedBack] = useState(false);

  // Computed state for combining conditions
  const previewReady = !chatState.isStreaming && chatState.codeReady;

  // Computed state for combining conditions
  const previewReady = !chatState.isStreaming && chatState.codeReady;

  // Handle the case when preview becomes ready and streaming ends
  useEffect(() => {
    // Only switch to preview view when preview becomes ready AND streaming is complete
    if (previewReady && !chatState.isStreaming) {
      // Reset user preference so future code content will auto-show preview
      setUserClickedBack(false);

      // Only auto-show preview if the user hasn't explicitly clicked back to chat
      if (!userClickedBack) {
        setMobilePreviewShown(true);
      }
    }
  }, [previewReady, userClickedBack, chatState.isStreaming, setMobilePreviewShown]);

  // Update mobilePreviewShown when selectedCode changes
  useEffect(() => {
    // If we're on a mobile device and there's code content
    if (chatState.selectedCode?.content) {
      // Only show preview when:
      // 1. Streaming has finished (!chatState.isStreaming)
      // 2. Preview is ready (previewReady)
      // 3. We're on mobile (isMobileViewport())
      if (!chatState.isStreaming && previewReady && isMobileViewport()) {
        setMobilePreviewShown(true);
      }
    }

    // Update wasStreaming ref to track state changes
    wasStreamingRef.current = chatState.isStreaming;
  }, [chatState.selectedCode, chatState.isStreaming, previewReady]);

  // Handle URL path navigation
  useEffect(() => {
    // Only navigate to /app if we're not already on a specific tab route
    // This prevents overriding user's manual tab selection
    // Add null check for location to prevent errors in tests
    const path = location?.pathname || '';
    const hasTabSuffix = path.endsWith('/app') || path.endsWith('/code') || path.endsWith('/data');

      if (!hasTabSuffix && chatState.sessionId && chatState.title) {
        setActiveView('preview');
        navigate(`/chat/${chatState.sessionId}/${encodeTitle(chatState.title)}/app`, {
          replace: true,
        });
      } else if (path.endsWith('/app')) {
        setActiveView('preview');
      } else if (path.endsWith('/code')) {
        setActiveView('code');
      } else if (path.endsWith('/data')) {
        setActiveView('data');
      }
    }
  }, [
    chatState.selectedCode,
    chatState.sessionId,
    chatState.title,
    navigate,
    location.pathname,
    setActiveView,
    chatState.isStreaming,
    userClickedBack,
    setMobilePreviewShown,
  ]);
  const shouldUseFullWidthChat = chatState.docs.length === 0 && !urlSessionId;

  return (
    <>
      <AppLayout
        fullWidthChat={shouldUseFullWidthChat}
        headerLeft={<ChatHeaderContent onOpenSidebar={openSidebar} title={chatState.title || ''} />}
        headerRight={
          // Only render the header content when we have code content or a completed session
          chatState.selectedCode?.content || urlSessionId ? (
            <ResultPreviewHeaderContent
              previewReady={!chatState.isStreaming && chatState.codeReady}
              activeView={activeView}
              setActiveView={setActiveView}
              setMobilePreviewShown={setMobilePreviewShown}
              isStreaming={chatState.isStreaming}
              code={chatState.selectedCode?.content || ''}
              sessionId={chatState.sessionId || undefined}
              title={chatState.title || undefined}
              isIframeFetching={isIframeFetching}
            />
          ) : null
        }
        chatPanel={
          <ChatInterface
            {...chatState}
            setMobilePreviewShown={setMobilePreviewShown}
            setActiveView={setActiveView}
          />
        }
        previewPanel={
          <ResultPreview
            sessionId={chatState.sessionId || ''}
            code={chatState.selectedCode?.content || ''}
            dependencies={chatState.selectedDependencies || {}}
            isStreaming={chatState.isStreaming}
            codeReady={chatState.codeReady}
            onScreenshotCaptured={chatState.addScreenshot}
            activeView={activeView}
            setActiveView={setActiveView}
            onPreviewLoaded={() => {}}
            setMobilePreviewShown={setMobilePreviewShown}
            setIsIframeFetching={() => {}}
          />
        }
        chatInput={
          <ChatInput
            value={chatState.input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={() => {
              chatState.sendMessage();
              setMessageHasBeenSent(true);
            }}
            disabled={chatState.isStreaming}
            inputRef={chatState.inputRef}
          />
        }
        suggestionsComponent={
          chatState.docs.length === 0 ? (
            <QuickSuggestions onSelectSuggestion={handleSelectSuggestion} />
          ) : undefined
        }
        mobilePreviewShown={mobilePreviewShown}
      />
      <SessionSidebar
        isVisible={isSidebarVisible}
        onClose={closeSidebar}
        sessionId={chatState.sessionId || ''}
      />
    </>
  );
}

// Export the main component that sets up the provider
export default function UnifiedSession() {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const chatState = useSimpleChat(urlSessionId);

  // Define the initial props for the ViewState hook
  const viewStateInitialProps = {
    sessionId: chatState.sessionId || '',
    title: chatState.title || '',
    code: chatState.selectedCode?.content || '',
    isStreaming: chatState.isStreaming,
    previewReady: !chatState.isStreaming && chatState.codeReady,
    initialLoad: true,
    isMobileView: true,
    onBackClicked: () => {
      // console.log('Back clicked - handled by ViewStateProvider/hook');
    },
    onPreviewLoaded: () => {
      // console.log('Preview loaded - handled by ViewStateProvider/hook');
    },
    onScreenshotCaptured: chatState.addScreenshot,
    codeReady: chatState.codeReady,
    dependencies: chatState.selectedDependencies || {},
  };

  return (
    <ViewStateProvider initialProps={viewStateInitialProps}>
      <SessionContent />
    </ViewStateProvider>
  );
}
