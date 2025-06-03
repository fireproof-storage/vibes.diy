import React, { useEffect, useState, useMemo } from 'react';
import { animationStyles } from './ResultPreviewTemplates';
import type { ResultPreviewProps, IframeFiles } from './ResultPreviewTypes';
import type { RuntimeError } from '../../hooks/useRuntimeErrors';
// import { encodeTitle } from '../SessionSidebar/utils';
// ResultPreview component
import IframeContent from './IframeContent';

function ResultPreview({
  code,
  dependencies = {},
  onScreenshotCaptured,
  sessionId,
  isStreaming = false,
  codeReady = false,
  displayView,
  onPreviewLoaded,
  setMobilePreviewShown,
  setIsIframeFetching,
  addError,
  children,
  title,
}: ResultPreviewProps & { children?: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode
  const showWelcome = !isStreaming && (!code || code.length === 0);

  // Calculate filesContent directly based on code prop
  const filesContent = useMemo<IframeFiles>(() => {
    // Always return the expected structure, defaulting code to empty string
    return {
      '/App.jsx': {
        code: code && !showWelcome ? code : '', // Use code if available, else empty string
        active: true,
      },
    };
  }, [code, showWelcome, codeReady, isStreaming]); // Include codeReady to ensure updates

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
          const storedKey = localStorage.getItem('vibes-openrouter-key');
          console.log('storedKey', storedKey);
          if (storedKey) {
            const keyData = JSON.parse(storedKey);
            const iframe = document.querySelector('iframe') as HTMLIFrameElement;
            iframe?.contentWindow?.postMessage({ type: 'callai-api-key', key: keyData.key }, '*');
            setMobilePreviewShown(true);
            onPreviewLoaded();
          }
        } else if (data.type === 'streaming' && data.state !== undefined) {
          if (setIsIframeFetching) {
            setIsIframeFetching(data.state);
          }
        } else if (data.type === 'screenshot' && data.data) {
          if (onScreenshotCaptured) {
            onScreenshotCaptured(data.data);
          }
        } else if (data.type === 'screenshot-error' && data.error) {
          // Still call onScreenshotCaptured with null to signal that the screenshot failed
          if (onScreenshotCaptured) {
            onScreenshotCaptured(null);
          }
        } else if (data.type === 'iframe-error' && data.error) {
          const error = data.error as RuntimeError;
          if (addError) {
            addError(error);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [
    onScreenshotCaptured,
    onPreviewLoaded,
    setIsIframeFetching,
    setMobilePreviewShown,
    addError,
    sessionId,
    title,
  ]);

  const previewArea = showWelcome ? (
    <div className="h-full">{/* empty div to prevent layout shift */}</div>
  ) : (
    <IframeContent
      activeView={displayView}
      filesContent={filesContent}
      isStreaming={!codeReady}
      codeReady={codeReady}
      isDarkMode={isDarkMode}
      sessionId={sessionId}
    />
  );

  return (
    <div className="h-full" style={{ overflow: 'hidden' }}>
      <style>{animationStyles}</style>
      {previewArea}
      {children}
    </div>
  );
}

export default ResultPreview;
