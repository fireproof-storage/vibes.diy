import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { ViewType, ViewStateProps } from './types';
import { isMobileViewport, getViewFromPath } from './utils';

type UseDisplayViewParams = {
  mobilePreviewShown: boolean;
  initialNavigationDoneRef: React.MutableRefObject<boolean>;
  props: Pick<ViewStateProps, 'isStreaming' | 'previewReady'>;
};

// Hook to compute which view should be displayed
export function useDisplayView({
  mobilePreviewShown,
  initialNavigationDoneRef,
  props
}: UseDisplayViewParams) {
  const location = useLocation();
  
  // Get current view from path
  const currentView = getViewFromPath(location.pathname);

  // Determine what view should be displayed (may differ from URL-based currentView)
  const displayView = useMemo(() => {
    let view: ViewType;

    if (isMobileViewport()) {
      // MOBILE BEHAVIOR:
      // - Default to showing chat/code view when streaming
      // - Show app preview when mobilePreviewShown is true (after ready)
      view = mobilePreviewShown ? 'preview' : 'code';
    } else {
      // DESKTOP BEHAVIOR:
      // - Default to the view determined by the URL (currentView)
      // - Override during first message streaming to show code without changing URL
      if (props.isStreaming && !initialNavigationDoneRef.current) {
        // First message, code is streaming - show code view
        view = 'code';
      } else if (
        initialNavigationDoneRef.current &&
        !props.previewReady &&
        !location.pathname.endsWith('/app') &&
        !location.pathname.endsWith('/code') &&
        !location.pathname.endsWith('/data')
      ) {
        // Show code preview until preview is ready and URL doesn't specify a view
        view = 'code';
      } else {
        // Otherwise use the URL-based current view
        view = currentView;
      }
    }

    return view;
  }, [
    mobilePreviewShown, 
    props.isStreaming, 
    props.previewReady, 
    currentView, 
    initialNavigationDoneRef.current,
    location.pathname
  ]);

  return {
    currentView,
    displayView
  };
}
