import { useState, useEffect, useRef, useMemo } from 'react';
import type { ResultPreviewProps } from './ResultPreviewTypes';
import type { SandpackFiles } from './ResultPreviewTypes';
import { indexHtml, animationStyles } from './ResultPreviewTemplates';
import { processCodeForDisplay } from './ResultPreviewUtils';
import WelcomeScreen from './WelcomeScreen';
import SandpackContent from './SandpackContent';

function ResultPreview({
  code,
  dependencies = {},
  onScreenshotCaptured,
  sessionId,
  isStreaming = false,
  codeReady = false,
  activeView,
  setActiveView,
  onPreviewLoaded,
}: ResultPreviewProps) {
  const [bundlingComplete, setBundlingComplete] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);

  const filesRef = useRef<SandpackFiles>({});
  const showWelcome = !isStreaming && (!code || code.length === 0);

  const sandpackKey = useMemo(() => {
    if (showWelcome) return `${sessionId || 'default'}-welcome`;
    return `${sessionId || 'default'}-${isStreaming ? 'streaming' : 'static'}-${code}`;
  }, [sessionId, codeReady, code, showWelcome]);

  useEffect(() => {
    if (isStreaming) {
      // Reset to code view when streaming starts
      setActiveView('code');
    }
  }, [isStreaming, setActiveView]);

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data) {
        if (data.type === 'preview-loaded') {
          setPreviewReady(true);
          // Automatically switch to preview view when it's ready
          setActiveView('preview');
          // Notify parent component that preview is loaded
          onPreviewLoaded();
        } else if (data.type === 'screenshot' && data.data) {
          console.log('ResultPreview: Received screenshot');
          if (onScreenshotCaptured) {
            onScreenshotCaptured(data.data);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onScreenshotCaptured, setActiveView, onPreviewLoaded]);

  useEffect(() => {
    if (!showWelcome) {
      const processedCode = processCodeForDisplay(code);
      filesRef.current = {
        ...filesRef.current,
        '/App.jsx': {
          code: processedCode,
          active: true,
        },
      };
    }
  }, [code, showWelcome]);

  const previewArea = showWelcome ? (
    <div className="h-full">
      <WelcomeScreen />
    </div>
  ) : (
    (() => {
      // Initialize files content here, right before SandpackContent is rendered
      filesRef.current = {
        '/index.html': {
          code: indexHtml,
          hidden: true,
        },
        '/App.jsx': {
          code: processCodeForDisplay(code),
          active: true,
        },
      };

      return (
        <SandpackContent
          activeView={activeView}
          filesContent={filesRef.current}
          isStreaming={!codeReady}
          codeReady={codeReady}
          sandpackKey={sandpackKey}
          setActiveView={setActiveView}
          setBundlingComplete={setBundlingComplete}
          dependencies={dependencies}
        />
      );
    })()
  );

  return (
    <div className="h-full" style={{ overflow: 'hidden' }}>
      <style>{animationStyles}</style>
      {previewArea}
    </div>
  );
}

export default ResultPreview;
