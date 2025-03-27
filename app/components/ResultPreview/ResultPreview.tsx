import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CALLAI_API_KEY } from '../../config/env';
import { animationStyles, indexHtml } from './ResultPreviewTemplates';
import type { ResultPreviewProps, IframeFiles } from './ResultPreviewTypes';
// ResultPreview component
import IframeContent from './IframeContent';

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
  setMobilePreviewShown,
  children,
}: ResultPreviewProps & { children?: React.ReactNode }) {
  // Add theme detection at the parent level
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode
  // Note: setBundlingComplete is used by IframeContent, but bundlingComplete isn't used here
  const [, setBundlingComplete] = useState(true);
  const isStreamingRef = useRef(isStreaming);
  const hasGeneratedStreamingKeyRef = useRef(false);

  const filesRef = useRef<IframeFiles>({});
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
    // if (showWelcome) return 'welcome';
    if (!codeReady) return 'streaming';
    return 'static';
  }, [codeReady]);

  useEffect(() => {
    if (isStreaming) {
      // Reset to code view when streaming starts
      setActiveView('code');
    } else if (codeReady) {
      // Switch to preview when streaming ends and code is ready
      setActiveView('preview');
    }
  }, [isStreaming, setActiveView, codeReady]);

  // Theme detection effect
  useEffect(() => {
    // Add a small delay to ensure the app's theme detection in root.tsx has run first
    const timeoutId = setTimeout(() => {
      // Check if document has the dark class
      const hasDarkClass = document.documentElement.classList.contains('dark');

      // Set the theme state
      setIsDarkMode(hasDarkClass);

      // Set up observer to watch for class changes on document.documentElement
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            // Directly check for dark class
            const hasDarkClass = document.documentElement.classList.contains('dark');

            setIsDarkMode(hasDarkClass);
          }
        });
      });

      // Start observing
      observer.observe(document.documentElement, { attributes: true });

      return () => observer.disconnect();
    }, 100); // Slightly shorter delay than before

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data) {
        if (data.type === 'preview-ready' || data.type === 'preview-loaded') {
          // respond with the API key
          const iframe = document.querySelector('iframe') as HTMLIFrameElement;
          iframe?.contentWindow?.postMessage({ type: 'callai-api-key', key: CALLAI_API_KEY }, '*');

          setMobilePreviewShown(true);
          // Automatically switch to preview view when it's ready
          setActiveView('preview');

          // Notify parent component that preview is loaded
          onPreviewLoaded();
        } else if (data.type === 'screenshot' && data.data) {
          if (onScreenshotCaptured) {
            onScreenshotCaptured(data.data);
          }
        } else if (data.type === 'screenshot-error' && data.error) {
          console.warn('Screenshot capture error:', data.error);
          // Still call onScreenshotCaptured with null to signal that the screenshot failed
          if (onScreenshotCaptured) {
            onScreenshotCaptured(null);
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
      const processedCode = code;
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
            const iframe = document.querySelector('iframe') as HTMLIFrameElement;
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
    <div className="h-full">{/* empty div to prevent layout shift */}</div>
  ) : (
    (() => {
      // Initialize files content here, right before SandpackContent is rendered
      filesRef.current = {
        '/index.html': {
          code: indexHtml,
          hidden: true,
        },
        '/App.jsx': {
          code: code,
          active: true,
        },
      };

      return (
        <IframeContent
          activeView={activeView}
          filesContent={filesRef.current}
          isStreaming={!codeReady}
          codeReady={codeReady}
          sandpackKey={sandpackKey}
          setActiveView={setActiveView}
          setBundlingComplete={setBundlingComplete}
          dependencies={dependencies}
          isDarkMode={isDarkMode} // Pass down the theme state
        />
      );
    })()
  );

  return (
    <div className="h-full" style={{ overflow: 'hidden' }}>
      <style>{animationStyles}</style>
      {previewArea}
      {/* Pass previewReady and bundlingComplete to the header
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === ResultPreviewHeaderContent) {
          return React.cloneElement(child, { previewReady, bundlingComplete });
        }
        return child;
      })} */}
    </div>
  );
}

export default ResultPreview;
