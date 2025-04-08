import { useCallback, useEffect, useState } from 'react';
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
import { useViewState } from '../utils/ViewState';
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

  // Local state for sidebar visibility only
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // For backwards compatibility with components that expect setActiveView
  const [activeView, setActiveView] = useState<'code' | 'preview' | 'data'>('code');

  // Use the centralized ViewState hook for all view-related state management
  const viewState = useViewState({
    sessionId: chatState.sessionId || '',
    title: chatState.title || '',
    code: chatState.selectedCode?.content || '',
    isStreaming: chatState.isStreaming,
    previewReady: !chatState.isStreaming && chatState.codeReady,
    initialLoad: true,
    isMobileView: true,
    onBackClicked: () => {
      // Any home-specific behavior when back is clicked
    },
  });

  // Extract only the values we need from viewState
  const {
    currentView,
    mobilePreviewShown,
    setMobilePreviewShown,
    isIframeFetching,
    setIsIframeFetching,
  } = viewState;

  // For backwards compatibility, sync ViewState with local state
  // This allows us to gradually migrate components to use ViewState directly
  useEffect(() => {
    setActiveView(currentView);
  }, [currentView, setActiveView]);

  // Derive previewReady from chatState for backwards compatibility
  const previewReady = !chatState.isStreaming && chatState.codeReady;

  // Directly create an openSidebar function
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  // Add closeSidebar function
  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Handle preview loaded event - simplified since ViewState manages most of this
  const handlePreviewLoaded = useCallback(() => {
    // ViewState now handles setting mobilePreviewShown and navigating to preview
    // This handler remains for any app-specific needs
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

  // Preview visibility is now managed by ViewState
  // No need for a separate effect to show preview when ready

  // Handle URL-specific navigation when code changes
  useEffect(() => {
    if (chatState.selectedCode?.content) {
      // Only navigate to /app if we're not already on a specific tab route
      // This prevents overriding user's manual tab selection
      const path = location?.pathname || '';
      const hasTabSuffix =
        path.endsWith('/app') || path.endsWith('/code') || path.endsWith('/data');

      if (!hasTabSuffix && chatState.sessionId && chatState.title) {
        // Navigate to preview URL - view state itself is managed by ViewState
        navigate(`/chat/${chatState.sessionId}/${encodeTitle(chatState.title)}/app`, {
          replace: true,
        });
      }
    }
  }, [chatState.selectedCode, chatState.sessionId, chatState.title, navigate, location?.pathname]);

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
              previewReady={previewReady}
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
            onPreviewLoaded={handlePreviewLoaded}
            setMobilePreviewShown={setMobilePreviewShown}
            setIsIframeFetching={setIsIframeFetching}
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
