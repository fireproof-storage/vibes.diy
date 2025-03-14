import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import ChatInterface from '../components/ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import ChatHeaderContent from '../components/ChatHeaderContent';
import ResultPreviewHeaderContent from '../components/ResultPreview/ResultPreviewHeaderContent';
import { useSimpleChat } from '../hooks/useSimpleChat';
import AppLayout from '../components/AppLayout';
import { decodeStateFromUrl } from '../utils/sharing';
import { encodeTitle } from '~/components/SessionSidebar/utils';

export function meta() {
  return [
    { title: 'Fireproof App Builder' },
    { name: 'description', content: 'Build React components with AI' },
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
  const [bundlingComplete, setBundlingComplete] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Directly create an openSidebar function
  const openSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  // Handle preview loaded event
  const handlePreviewLoaded = useCallback(() => {
    setPreviewReady(true);
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

  return (
    <AppLayout
      headerLeft={
        <ChatHeaderContent onOpenSidebar={openSidebar} title={chatState.title || 'New Chat'} />
      }
      headerRight={
        <ResultPreviewHeaderContent
          previewReady={previewReady}
          activeView={activeView}
          setActiveView={setActiveView}
          bundlingComplete={bundlingComplete}
          isStreaming={chatState.isStreaming}
          code={chatState.selectedCode?.content || ''}
          dependencies={chatState.selectedDependencies || {}}
        />
      }
      chatPanel={
        <ChatInterface
          {...chatState}
          isSidebarVisible={isSidebarVisible}
          setIsSidebarVisible={setIsSidebarVisible}
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
        />
      }
    />
  );
}
