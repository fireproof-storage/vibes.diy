import { useState, useEffect, useRef, useMemo } from 'react';
import type { ResultPreviewProps } from './ResultPreviewTypes';
import type { SandpackFiles } from './ResultPreviewTypes';
import { indexHtml, animationStyles } from './ResultPreviewTemplates';
import { processCodeForDisplay } from './ResultPreviewUtils';
import WelcomeScreen from './WelcomeScreen';
import ResultPreviewToolbar from './ResultPreviewToolbar';
import SandpackContent from './SandpackContent';

function ResultPreview({
  code,
  dependencies = {},
  onScreenshotCaptured,
  initialView = 'code',
  sessionId,
  isStreaming = false,
}: ResultPreviewProps) {
  const [activeView, setActiveView] = useState<'preview' | 'code'>(initialView);
  const [bundlingComplete, setBundlingComplete] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);

  const filesRef = useRef<SandpackFiles>({});
  const showWelcome = !code || code.length === 0;

  const sandpackKey = useMemo(() => {
    if (showWelcome) return `${sessionId || 'default'}-welcome`;
    return `${sessionId || 'default'}-${isStreaming ? 'streaming' : 'static'}-${code}`;
  }, [sessionId, isStreaming, code, showWelcome]);

  useEffect(() => {
    if (isStreaming) {
      setActiveView('code');
    }
  }, [isStreaming]); 

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data) {
        if (data.type === 'preview-loaded') {
          setPreviewReady(true);
          setActiveView('preview');
        } else if (data.type === 'screenshot' && data.data) {
          console.log('ResultPreview: Received screenshot');
          if (onScreenshotCaptured) {
            onScreenshotCaptured(data.data);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onScreenshotCaptured]);

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
    <div className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
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
          isStreaming={isStreaming}
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

      <ResultPreviewToolbar
        previewReady={previewReady}
        activeView={activeView}
        setActiveView={setActiveView}
        bundlingComplete={bundlingComplete}
        isStreaming={isStreaming}
        code={code}
        dependencies={dependencies}
      />

      {previewArea}
    </div>
  );
}

export default ResultPreview;
