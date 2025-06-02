import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { encodeTitle } from '~/components/SessionSidebar/utils';
import AppLayout from '../components/AppLayout';
import ChatHeaderContent from '../components/ChatHeaderContent';
import ChatInput from '../components/ChatInput';
import ChatInterface from '../components/ChatInterface';
import QuickSuggestions from '../components/QuickSuggestions';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import ResultPreviewHeaderContent from '../components/ResultPreview/ResultPreviewHeaderContent';
import SessionSidebar from '../components/SessionSidebar';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import { useSimpleChat } from '../hooks/useSimpleChat';
import { isMobileViewport, useViewState } from '../utils/ViewState';

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

  const [previewReady, setPreviewReady] = useState(false);
  const [mobilePreviewShown, setMobilePreviewShown] = useState(false);
  const [isIframeFetching, setIsIframeFetching] = useState(false);

  // Centralized view state management
  const { displayView, navigateToView, viewControls, showViewControls } = useViewState({
    sessionId: chatState.sessionId || undefined, // Handle null
    title: chatState.title || undefined, // Handle null
    code: chatState.selectedCode?.content || '',
    isStreaming: chatState.isStreaming,
    previewReady: previewReady,
    isIframeFetching: isIframeFetching,
  });

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

    // setActiveView('preview'); // This is now handled by useViewState when previewReady changes
  }, []); // chatState.isStreaming, chatState.codeReady removed as setActiveView is gone and useViewState handles this logic

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

  // Check if there's a prompt parameter in the URL to prefill the chat input
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    // Check for prompt parameter to prefill chat input
    const promptParam = searchParams.get('prompt');
    if (promptParam && promptParam.trim()) {
      chatState.setInput(promptParam);

      // Focus the input element and place cursor at the end after a short delay
      // to ensure the input has been updated and DOM is ready
      setTimeout(() => {
        if (chatState.inputRef.current) {
          chatState.inputRef.current.focus();

          // Place cursor at the end of the text
          const inputLength = chatState.inputRef.current.value.length;
          chatState.inputRef.current.setSelectionRange(inputLength, inputLength);
        }
      }, 100);
    }
  }, [location.search, chatState.setInput]);

  // We're now passing chatState directly to ChatInput

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

  // Handle initial URL path navigation if no view suffix.
  // useViewState handles subsequent auto-navigation based on state changes (e.g. previewReady).
  useEffect(() => {
    const path = location?.pathname || '';
    const hasTabSuffix = path.endsWith('/app') || path.endsWith('/code') || path.endsWith('/data');
    const encodedAppTitle = chatState.title ? encodeTitle(chatState.title) : '';

    // If there's a session and title, but no specific view suffix in the URL, navigate to the 'app' (preview) view.
    if (!hasTabSuffix && chatState.sessionId && encodedAppTitle) {
      navigate(`/chat/${chatState.sessionId}/${encodedAppTitle}/app`, {
        replace: true,
      });
    }
  }, [chatState.sessionId, chatState.title, navigate, location.pathname]);

  // Switch to 2-column view immediately when a message is submitted
  const shouldUseFullWidthChat =
    chatState.docs.length === 0 && !urlSessionId && !hasSubmittedMessage;

  return (
    <>
      <AppLayout
        fullWidthChat={shouldUseFullWidthChat}
        headerLeft={
          <ChatHeaderContent
            remixOf={chatState.vibeDoc?.remixOf}
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
              displayView={displayView}
              navigateToView={navigateToView}
              viewControls={viewControls}
              showViewControls={!!showViewControls}
              setMobilePreviewShown={setMobilePreviewShown}
              setUserClickedBack={setUserClickedBack} // Keep this for BackButton logic
              isStreaming={chatState.isStreaming}
              // Props needed by usePublish and useSession within ResultPreviewHeaderContent:
              code={chatState.selectedCode?.content || ''}
              sessionId={chatState.sessionId || undefined} // Handle null
              title={chatState.title || undefined} // Handle null
              previewReady={previewReady} // needed for publish button visibility logic
            />
          ) : null
        }
        chatPanel={
          <ChatInterface
            {...chatState}
            setMobilePreviewShown={setMobilePreviewShown}
            navigateToView={navigateToView}
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
            displayView={displayView}
            onPreviewLoaded={handlePreviewLoaded}
            setMobilePreviewShown={setMobilePreviewShown}
            setIsIframeFetching={setIsIframeFetching}
            addError={(error) => chatState.addError(error)}
          />
        }
        chatInput={
          <ChatInput
            chatState={chatState}
            onSend={() => {
              // Only handle side effects here
              setMessageHasBeenSent(true);
              setHasSubmittedMessage(true);
              if (chatState.needsLogin === true) {
                window.dispatchEvent(new Event('needsLoginTriggered'));
              }
            }}
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
