import { useState, useEffect, useRef, useMemo } from 'react';
import type { ResultPreviewProps } from './ResultPreviewTypes';
import type { SandpackFiles } from './ResultPreviewTypes';
import { indexHtml, defaultCode, animationStyles } from './ResultPreviewTemplates';
import { processCodeForDisplay } from './ResultPreviewUtils';
import WelcomeScreen from './WelcomeScreen';
import ResultPreviewToolbar from './ResultPreviewToolbar';
import SandpackContent from './SandpackContent';

function ResultPreview({
  code,
  dependencies = {},
  onShare,
  onScreenshotCaptured,
  initialView = 'preview',
  sessionId,
  isStreaming = false,
}: ResultPreviewProps) {
  const [activeView, setActiveView] = useState<'preview' | 'code'>(initialView);
  const [displayCode, setDisplayCode] = useState(code || defaultCode);
  const [bundlingComplete, setBundlingComplete] = useState(true);

  const [lockCodeView, setLockCodeView] = useState(false);
  const filesRef = useRef<SandpackFiles>({
    '/index.html': {
      code: indexHtml,
      hidden: true,
    },
    '/App.jsx': {
      code: code || defaultCode,
      active: true,
    },
  });

  const showWelcome = code.length === 0;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.screenshot) {
        const screenshotData = event.data.screenshot;

        if (onScreenshotCaptured) {
          onScreenshotCaptured(screenshotData);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onScreenshotCaptured]);

  // Update code when it changes
  useEffect(() => {
    if (code) {
      console.log('ResultPreview: Updating code, length:', code?.length || 0);
      const processedCode = processCodeForDisplay(code);
      setDisplayCode(processedCode);

      filesRef.current = {
        ...filesRef.current,
        '/App.jsx': {
          code: processedCode,
          active: true,
        },
      };

    }
  }, [code]);

  // Create a unique key for SandpackProvider that changes when relevant props change
  const sandpackKey = useMemo(() => {
    return `${sessionId || 'default'}-${isStreaming ? 'streaming' : 'static' + code}`;
  }, [sessionId, isStreaming, code]);

  return (
    <div className="h-full" style={{ overflow: 'hidden' }}>
      <style>{animationStyles}</style>

      <ResultPreviewToolbar
        showWelcome={showWelcome}
        activeView={activeView}
        setActiveView={setActiveView}
        bundlingComplete={bundlingComplete}
        isStreaming={isStreaming}
        onShare={onShare}
      />

      {showWelcome ? (
        <div className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
          <WelcomeScreen />
        </div>
      ) : (
        <SandpackContent
          activeView={activeView}
          filesContent={filesRef.current}
          isStreaming={isStreaming}
          lockCodeView={lockCodeView}
          sandpackKey={sandpackKey}
          setActiveView={setActiveView}
          setBundlingComplete={setBundlingComplete}
          dependencies={dependencies}
          onScreenshotCaptured={onScreenshotCaptured}
        />
      )}

      <div className="result-content">
        {!showWelcome && (
          <button
            data-testid="copy-button"
            onClick={() => navigator.clipboard.writeText(displayCode)}
            className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
          >
            Copy to Clipboard
          </button>
        )}
      </div>
    </div>
  );
}

export default ResultPreview;
