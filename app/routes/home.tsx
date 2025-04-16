import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useCookieConsent } from '../context/CookieConsentContext';
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

export default function UnifiedSession() {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const chatState = useSimpleChat(urlSessionId);
  const { setMessageHasBeenSent } = useCookieConsent();

  // Track message submission events
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);

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

    // Always show preview on mobile devices when it's ready, regardless of streaming status
    if (isMobileViewport()) {
      setMobilePreviewShown(true);
    }

    // Update the active view locally, but don't force navigation
    // Let the user stay on their current tab
    setActiveView('preview');
  }, [chatState.isStreaming, chatState.codeReady]);

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
  }, [chatState.title, location.pathname, chatState.sessionId, navigate]);

  // Check if there's a state parameter in the URL (for shared apps)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const encodedState = searchParams.get('state');
    if (encodedState) {
      const decodedState = decodeStateFromUrl(encodedState);
      if (decodedState.code) {
        console.log('UnifiedSession: decodedState share:', decodedState);
      }
    }
  }, [location.search]);

  // Create chat input event handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      chatState.setInput(e.target.value);
    },
    [chatState.setInput]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !chatState.isStreaming) {
        e.preventDefault();
        chatState.sendMessage(chatState.input);
        setMessageHasBeenSent(true);
      }
    },
    [chatState.isStreaming, chatState.sendMessage, setMessageHasBeenSent]
  );

  // Handle suggestion selection directly
  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      chatState.setInput(suggestion);

      // Focus the input and position cursor at the end
      setTimeout(() => {
        if (chatState.inputRef.current) {
          chatState.inputRef.current.focus();
          // Move cursor to end of text
          chatState.inputRef.current.selectionStart = chatState.inputRef.current.selectionEnd =
            suggestion.length;
        }
      }, 0);
    },
    [chatState.setInput, chatState.inputRef]
  );

  // Track if user manually clicked back to chat during streaming
  const [userClickedBack, setUserClickedBack] = useState(false);

  // Handle the case when preview becomes ready
  useEffect(() => {
    // Switch to preview view as soon as preview becomes ready, regardless of streaming status
    if (previewReady) {
      // Reset user preference so future code content will auto-show preview
      setUserClickedBack(false);

      // Only auto-show preview if the user hasn't explicitly clicked back to chat
      if (!userClickedBack) {
        setMobilePreviewShown(true);
      }
    }
  }, [previewReady, userClickedBack, chatState.isStreaming, chatState.codeReady]);

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
  }, [chatState.sessionId, chatState.title, navigate, location.pathname, setActiveView]);

  // Switch to 2-column view immediately when a message is submitted
  const shouldUseFullWidthChat =
    chatState.docs.length === 0 && !urlSessionId && !hasSubmittedMessage;

  return (
    <>
      <AppLayout
        fullWidthChat={shouldUseFullWidthChat}
        headerLeft={
          <ChatHeaderContent
            onOpenSidebar={openSidebar}
            isStreaming={chatState.isStreaming}
            codeReady={chatState.codeReady}
            title={chatState.title || ''}
          />
        }
        headerRight={
          // Only render the header content when we have code content or a completed session
          chatState.selectedCode?.content || urlSessionId ? (
            <ResultPreviewHeaderContent
              previewReady={previewReady}
              activeView={activeView}
              setActiveView={setActiveView}
              setMobilePreviewShown={setMobilePreviewShown}
              setUserClickedBack={setUserClickedBack}
              isStreaming={chatState.isStreaming}
              code={chatState.selectedCode?.content || ''}
              sessionId={chatState.sessionId || undefined}
              title={chatState.title || undefined}
              isIframeFetching={isIframeFetching}
              needsLogin={chatState.needsLogin}
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
            onPreviewLoaded={handlePreviewLoaded}
            setMobilePreviewShown={setMobilePreviewShown}
            setIsIframeFetching={setIsIframeFetching}
            addError={(error) => chatState.addError(error)}
          />
        }
        chatInput={
          <ChatInput
            isStreaming={chatState.isStreaming}
            value={chatState.input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={() => {
              chatState.sendMessage(chatState.input);
              setMessageHasBeenSent(true);
              setHasSubmittedMessage(true);
            }}
            disabled={chatState.isStreaming}
            inputRef={chatState.inputRef}
            docsLength={chatState.docs.length}
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
