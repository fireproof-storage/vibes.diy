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
  const isStreamingRef = useRef(isStreaming);
  const hasGeneratedStreamingKeyRef = useRef(false);
  const streamingKeyRef = useRef<string>('');

  const filesRef = useRef<SandpackFiles>({});
  const showWelcome = !isStreaming && (!code || code.length === 0);

  // Track streaming state changes to reset key generation only when streaming starts/stops
  useEffect(() => {
    if (isStreaming !== isStreamingRef.current) {
      isStreamingRef.current = isStreaming;

      // Reset streaming key when streaming stops
      if (!isStreaming) {
        hasGeneratedStreamingKeyRef.current = false;
      }
    }
  }, [isStreaming]);

  const sandpackKey = useMemo(() => {
    if (showWelcome) return `${sessionId || 'default'}-welcome`;

    // During streaming, use a stable key that doesn't include the changing code
    if (isStreaming) {
      // Only generate a new streaming key once per streaming session
      if (!hasGeneratedStreamingKeyRef.current) {
        // Use timestamp to ensure unique key between different streaming sessions
        streamingKeyRef.current = `${sessionId || 'default'}-streaming`;
        hasGeneratedStreamingKeyRef.current = true;
      }
      return streamingKeyRef.current;
    }

    // For non-streaming mode, we can include the code in the key (content is stable)
    // But to prevent the key from being too long, just use a hash of the code
    return `${sessionId || 'default'}-static-${codeReady}}`;
  }, [sessionId, isStreaming, codeReady, showWelcome]);

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

  // Create refs outside useEffect to track timeout state
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const needsReloadRef = useRef(false);

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

      if (codeReady) {
        // Set the flag that we need to reload
        needsReloadRef.current = true;

        // Clear any existing timeout to avoid stacking
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }

        timeoutIdRef.current = setTimeout(() => {
          if (needsReloadRef.current) {
            const iframe = document.querySelector('.sp-preview-iframe') as HTMLIFrameElement;
            iframe?.contentWindow?.postMessage(
              {
                type: 'command',
                command: 'reload-preview',
              },
              '*'
            );
            needsReloadRef.current = false;
            timeoutIdRef.current = null;
          }
        }, 200);
      }
    }

    // Clean up timeout on unmount
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [code, showWelcome, codeReady]);

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
