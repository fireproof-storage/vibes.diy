import { useCallback, useEffect, useState } from 'react';
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
import { useSimpleChat } from '../hooks/useSimpleChat';
import { decodeStateFromUrl } from '../utils/sharing';
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
    setMobilePreviewShown(true);

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
        chatState.sendMessage();
      }
    },
    [chatState.isStreaming, chatState.sendMessage]
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

  // Update mobilePreviewShown when selectedCode changes
  useEffect(() => {
    if (chatState.selectedCode?.content) {
      setMobilePreviewShown(true);

      // Only navigate to /app if we're not already on a specific tab route
      // This prevents overriding user's manual tab selection
      // Add null check for location to prevent errors in tests
      const path = location?.pathname || '';
      const hasTabSuffix =
        path.endsWith('/app') || path.endsWith('/code') || path.endsWith('/data');

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
  ]);

  const shouldUseFullWidthChat = chatState.docs.length === 0 && !urlSessionId;

  return (
    <>
      <AppLayout
        fullWidthChat={shouldUseFullWidthChat}
        headerLeft={<ChatHeaderContent onOpenSidebar={openSidebar} title={chatState.title || ''} />}
        headerRight={
          chatState.selectedCode?.content ? (
            <ResultPreviewHeaderContent
              previewReady={previewReady}
              activeView={activeView}
              setActiveView={setActiveView}
              setMobilePreviewShown={setMobilePreviewShown}
              isStreaming={chatState.isStreaming}
              code={chatState.selectedCode?.content}
              dependencies={chatState.selectedDependencies || {}}
              sessionId={chatState.sessionId || undefined}
              title={chatState.title || undefined}
              isIframeFetching={isIframeFetching}
            />
          ) : null
        }
        chatPanel={<ChatInterface {...chatState} setMobilePreviewShown={setMobilePreviewShown} />}
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
            onSend={chatState.sendMessage}
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
