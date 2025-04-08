import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { ViewType } from './types';
import { isMobileViewport, sendApiKeyToIframe } from './utils';

type UseIframeMessageHandlerParams = {
  navigateToView: (view: ViewType) => void;
  setMobilePreviewShown: (value: boolean) => void;
  setIsIframeFetching: (value: boolean) => void;
  onPreviewLoaded?: () => void;
  onScreenshotCaptured?: (data: string | null) => void;
  isStreaming: boolean;
};

// Hook to handle iframe messages
export function useIframeMessageHandler({
  navigateToView,
  setMobilePreviewShown,
  setIsIframeFetching,
  onPreviewLoaded,
  onScreenshotCaptured,
  isStreaming,
}: UseIframeMessageHandlerParams) {
  const location = useLocation();

  // Iframe message handler
  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data) {
        if (data.type === 'preview-ready' || data.type === 'preview-loaded') {
          // respond with the API key
          sendApiKeyToIframe();
          
          setMobilePreviewShown(true);

          // Get current path information
          const path = location.pathname;
          const isInDataView = path.endsWith('/data');
          const isInCodeView = path.endsWith('/code');
          const isInSpecificView = isInDataView || isInCodeView;
          const isMobile = isMobileViewport();

          // Add a small delay before navigation to ensure the iframe is fully ready
          // This helps prevent race conditions that might cause button click issues
          setTimeout(() => {
            // Only auto-navigate to preview if:
            // 1. Not in a specific view (code or data)
            // 2. Not on mobile device
            // 3. Not currently streaming
            if (!isInSpecificView && !isMobile && !isStreaming) {
              navigateToView('preview');
            }

            // Notify parent component that preview is loaded
            if (onPreviewLoaded) {
              onPreviewLoaded();
            }
          }, 50); // Small delay to ensure state updates properly
        } else if (data.type === 'streaming' && data.state !== undefined) {
          setIsIframeFetching(data.state);
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
  }, [
    onPreviewLoaded, 
    onScreenshotCaptured, 
    navigateToView, 
    setMobilePreviewShown, 
    setIsIframeFetching,
    location.pathname,
    isStreaming
  ]);
}
