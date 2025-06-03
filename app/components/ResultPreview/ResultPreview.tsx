import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { animationStyles } from './ResultPreviewTemplates';
import type { ResultPreviewProps, IframeFiles } from './ResultPreviewTypes';
import type { RuntimeError } from '../../hooks/useRuntimeErrors';
import { useApiKey } from '../../hooks/useApiKey';
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
  // Still use the useApiKey hook for UI feedback, but we'll directly use ensureApiKey's return value
  // useApiKey returns apiKey as a string
  const { apiKey, isLoading: isLoadingApiKey, error: apiKeyError, ensureApiKey } = useApiKey();

  // Create a ref for the iframe to send postMessages
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track if we've successfully set the API key
  const apiKeySetRef = useRef<boolean>(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const isStreamingRef = useRef(isStreaming);
  const hasGeneratedStreamingKeyRef = useRef(false);

  const showWelcome = !isStreaming && (!code || code.length === 0);

  const filesContent = useMemo<IframeFiles>(() => {
    return {
      '/App.jsx': {
        code: code && !showWelcome ? code : '',
        active: true,
      },
    };
  }, [code, showWelcome, codeReady, isStreaming]);

  useEffect(() => {
    if (isStreaming !== isStreamingRef.current) {
      isStreamingRef.current = isStreaming;

      if (!isStreaming) {
        hasGeneratedStreamingKeyRef.current = false;
      }
    }
  }, [isStreaming]);

  // Function to get the API key and send it to the iframe
  const getAndSendApiKey = useCallback(async () => {
    try {
      // Directly use the return value of ensureApiKey instead of waiting for state updates
      // ensureApiKey returns { key: string, hash: string }
      const keyResult = await ensureApiKey();

      // If we have an iframe ref and the key is valid, send it via postMessage
      if (iframeRef.current?.contentWindow && keyResult && keyResult.key) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'SET_API_KEY', apiKey: keyResult.key },
          '*' // In production, consider using a specific origin for security
        );
        apiKeySetRef.current = true;
        console.log('Sent API key to iframe via postMessage');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to get or send API key:', err);
      return false;
    }
  }, [ensureApiKey]);

  // Effect to get and send the API key when the component mounts
  useEffect(() => {
    getAndSendApiKey();
  }, [getAndSendApiKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDarkMode(hasDarkClass);

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const hasDarkClass = document.documentElement.classList.contains('dark');
            setIsDarkMode(hasDarkClass);
          }
        });
      });

      observer.observe(document.documentElement, { attributes: true });

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data) {
        if (data.type === 'preview-ready' || data.type === 'preview-loaded') {
          // When the iframe tells us it's ready, send the API key
          if (!apiKeySetRef.current) {
            getAndSendApiKey();
          }

          setMobilePreviewShown(true);

          // Notify parent component that preview is loaded
          if (onPreviewLoaded) {
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
          // Process the error and forward it to the error handler
          const error = data.error as RuntimeError;

          // Send to error handler if available
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
    getAndSendApiKey, // Add getAndSendApiKey to dependencies
  ]);

  // Always render the iframe, but show overlays for different states
  // This ensures we have a consistent iframe that won't unmount/remount
  const showErrorOverlay = apiKeyError && !apiKey;
  const showLoadingOverlay = isLoadingApiKey && !apiKey && !apiKeySetRef.current;
  const showWelcomeOverlay = showWelcome;

  // Display states based on API key and welcome status
  let errorOverlay = null;
  let loadingOverlay = null;

  if (showErrorOverlay) {
    const isRateLimitError =
      apiKeyError.message.includes('rate limit') || apiKeyError.message.includes('429');
    errorOverlay = (
      <div className="bg-opacity-90 dark:bg-opacity-90 absolute inset-0 z-10 flex items-center justify-center bg-gray-100 p-4 text-center dark:bg-gray-900">
        <div>
          <h3 className="mb-2 text-lg font-medium">
            {isRateLimitError ? 'Rate Limited' : 'API Key Error'}
          </h3>
          <p className="mb-4 text-sm">
            {isRateLimitError
              ? 'Could not fetch API key due to rate limiting. Please wait a moment and try again.'
              : 'There was an issue obtaining the API key. Please ensure you are logged in or the key is valid.'}
          </p>
          <button
            onClick={() => getAndSendApiKey()}
            className="focus:ring-opacity-50 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showLoadingOverlay) {
    loadingOverlay = (
      <div className="bg-opacity-90 dark:bg-opacity-90 absolute inset-0 z-10 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-pulse">Loading API Key...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full" style={{ overflow: 'hidden' }}>
      <style>{animationStyles}</style>

      {/* Always render the iframe content */}
      {!showWelcomeOverlay && (
        <IframeContent
          ref={iframeRef}
          activeView={displayView}
          filesContent={filesContent}
          isStreaming={!codeReady}
          codeReady={codeReady}
          isDarkMode={isDarkMode}
          sessionId={sessionId}
          apiKey={apiKey} // This is already the string key from useApiKey
        />
      )}

      {/* Show welcome content if needed */}
      {showWelcomeOverlay && (
        <div className="h-full">{/* empty div to prevent layout shift */}</div>
      )}

      {/* Overlay loading indicator */}
      {loadingOverlay}

      {/* Overlay error message */}
      {errorOverlay}
    </div>
  );
}

export default ResultPreview;
