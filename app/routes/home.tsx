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

export function meta() {
  return [
    { title: 'AI App Builder' },
    { name: 'description', content: 'Write apps in one prompt' },
  ];
}

export default function UnifiedSession() {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const chatState = useSimpleChat(urlSessionId);

  // State for view management
  const [activeView, setActiveView] = useState<'code' | 'preview'>('code');
  const [previewReady, setPreviewReady] = useState(false);
  const [bundlingComplete] = useState(true);
  const [mobilePreviewShown, setMobilePreviewShown] = useState(false);

  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Directly create an openSidebar function
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  // Add closeSidebar function
  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  // Handle preview loaded event
  const handlePreviewLoaded = useCallback(() => {
    setPreviewReady(true);
    setMobilePreviewShown(true);
  }, []);

  useEffect(() => {
    if (chatState.title) {
      const newUrl = `/chat/${chatState.sessionId}/${encodeTitle(chatState.title)}`;
      if (newUrl !== location.pathname) {
        navigate(newUrl, { replace: true });
      }
    }
  }, [chatState.title]);

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
    }
  }, [chatState.selectedCode]);

  // useEffect(() => {
  //   console.log('chatState.sessionId', chatState.sessionId);
  // }, [chatState.sessionId]);

  return (
    <>
      <AppLayout
        headerLeft={<ChatHeaderContent onOpenSidebar={openSidebar} title={chatState.title || ''} />}
        headerRight={
          <ResultPreviewHeaderContent
            previewReady={previewReady}
            activeView={activeView}
            setActiveView={setActiveView}
            setMobilePreviewShown={setMobilePreviewShown}
            bundlingComplete={bundlingComplete}
            isStreaming={chatState.isStreaming}
            code={chatState.selectedCode?.content || ''}
            dependencies={chatState.selectedDependencies || {}}
          />
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
