import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { ViewType, ViewStateProps } from './types';
import { isMobileViewport } from './utils';

type UseAutoNavigationParams = {
  sessionId: string | undefined;
  encodedTitle: string;
  navigateToView: (view: ViewType) => void;
  setMobilePreviewShown: (value: boolean) => void;
  props: Pick<ViewStateProps, 'isStreaming' | 'previewReady' | 'code'>;
};

// Hook to handle auto-navigation based on app state
export function useAutoNavigation({
  sessionId,
  encodedTitle,
  navigateToView,
  setMobilePreviewShown,
  props,
}: UseAutoNavigationParams) {
  const location = useLocation();
  
  // Track previous states to determine transitions
  const wasStreamingRef = useRef(props.isStreaming);
  const hadCodeRef = useRef(props.code && props.code.length > 0);
  const wasPreviewReadyRef = useRef(props.previewReady);
  const initialNavigationDoneRef = useRef(false);

  // Auto-navigate based on app state changes
  useEffect(() => {
    // Don't auto-navigate if we don't have session and title info for URLs
    if (!sessionId || !encodedTitle) return;

    // Get current path information for determining navigation behavior
    const path = location.pathname;
    const isInDataView = path.endsWith('/data');
    const isInCodeView = path.endsWith('/code');
    const isInExplicitView = isInDataView || isInCodeView;
    const isMobile = isMobileViewport();

    // RULE: When First Code Arrives
    // While streaming and code arrives for the first time,
    // show code view without changing URL path
    if (props.isStreaming && !hadCodeRef.current && props.code && props.code.length > 0) {
      initialNavigationDoneRef.current = true;
    }

    // RULE: When Preview Becomes Ready
    // - Auto-navigate to App view (/app) only if:
    //   1. Preview is now ready (and wasn't before)
    //   2. URL doesn't have explicit /code or /data paths
    //   3. Not currently streaming
    if (props.previewReady && !wasPreviewReadyRef.current && !props.isStreaming) {
      // Only auto-navigate if not in explicit code/data view
      if (!isInExplicitView) {
        // For desktop: Navigate to app view
        if (!isMobile) {
          navigateToView('preview');
        }
        // For mobile: Show preview
        setMobilePreviewShown(true);
      }
    }

    // RULE: Streaming Ends with Preview Ready
    // When streaming ends and preview is ready, auto-navigate to app view
    // but only if URL doesn't have explicit /code or /data paths
    if (!props.isStreaming && wasStreamingRef.current && props.previewReady) {
      // We are in this branch, so streaming has just ended

      // Only auto-navigate when not in explicit code/data view
      if (!isInExplicitView) {
        // For desktop: Navigate to app view
        if (!isMobile) {
          navigateToView('preview');
        }
        // For mobile: Show preview
        setMobilePreviewShown(true);
      }
    }

    // Update refs for next comparison
    wasStreamingRef.current = props.isStreaming;
    hadCodeRef.current = props.code && props.code.length > 0;
    wasPreviewReadyRef.current = props.previewReady;
  }, [
    props.isStreaming,
    props.previewReady,
    props.code,
    sessionId,
    encodedTitle,
    navigateToView,
    location.pathname,
    setMobilePreviewShown,
  ]);

  return {
    initialNavigationDoneRef,
  };
}
