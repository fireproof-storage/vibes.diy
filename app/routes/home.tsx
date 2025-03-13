import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import ChatInterface from '../ChatInterface';
import ResultPreview from '../components/ResultPreview/ResultPreview';
import { useSimpleChat } from '../hooks/useSimpleChat';
import AppLayout from '../components/AppLayout';
import { copyToClipboard, encodeStateToUrl, decodeStateFromUrl } from '../utils/sharing';

export function meta() {
  return [
    { title: 'Fireproof App Builder' },
    { name: 'description', content: 'Build React components with AI' },
  ];
}

export default function UnifiedSession() {
  // Get sessionId from URL params if it exists
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [shareStatus, setShareStatus] = useState<string>('');

  const chatState = useSimpleChat(urlSessionId);


  


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

  function handleShare() {
    if (!chatState.selectedCode?.content) {
      alert('Generate an app first before sharing!');
      return;
    }
    const encoded = encodeStateToUrl(
      chatState.selectedCode.content,
      chatState.selectedDependencies || {}
    );
    if (encoded) {
      copyToClipboard(`${window.location.origin}/shared?state=${encoded}`);
      setShareStatus('Share URL copied to clipboard!');
      setTimeout(() => {
        setShareStatus('');
      }, 3000);
    }
  }

  return (
    <AppLayout
      chatPanel={<ChatInterface {...chatState} />}
      previewPanel={
        <ResultPreview
          sessionId={chatState.sessionId || ''}
          code={chatState.selectedCode?.content || ''}
          dependencies={chatState.selectedDependencies || {}}
          isStreaming={chatState.isStreaming}
          onShare={handleShare}
        />
      }
    />
  );
}
