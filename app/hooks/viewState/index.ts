import { useParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { encodeTitle } from '~/components/SessionSidebar/utils';

import type { ViewState, ViewStateProps } from './types';
import { useViewNavigation } from './useViewNavigation';
import { useViewControls } from './useViewControls';
import { useAutoNavigation } from './useAutoNavigation';
import { useIframeMessageHandler } from './useIframeMessageHandler';
import { useThemeDetection } from './useThemeDetection';
import { useDisplayView } from './useDisplayView';

// Export types and utilities for external use
export * from './types';
export { isMobileViewport } from './utils';

// Main hook that composes all the view state functionality
function useViewStateInternal(props: ViewStateProps): ViewState {
  const { sessionId: paramSessionId, title: paramTitle } = useParams<{
    sessionId: string;
    title: string;
  }>();

  // Consolidate session and title from props or params
  const sessionId = props.sessionId || paramSessionId;
  const title = props.title || paramTitle;
  const encodedTitle = title ? encodeTitle(title) : '';

  // Mobile-specific state
  const [mobilePreviewShown, setMobilePreviewShown] = useState(true);
  const [userClickedBack, setUserClickedBack] = useState(false);
  
  // State for iframe functionality
  const [isIframeFetching, setIsIframeFetching] = useState(!!props.isIframeFetching);

  // Use theme detection hook
  const { isDarkMode } = useThemeDetection();

  // Set up view controls
  const { viewControls, showViewControls } = useViewControls(props);

  // Set up navigation functions
  const { navigateToView, handleBackAction } = useViewNavigation({
    viewControls,
    sessionId,
    encodedTitle,
    isStreaming: props.isStreaming,
    setMobilePreviewShown,
    setUserClickedBack
  });

  // Set up auto-navigation based on app state
  const { initialNavigationDoneRef } = useAutoNavigation({
    sessionId,
    encodedTitle,
    navigateToView,
    setMobilePreviewShown,
    props
  });

  // Set up display view computation
  const { currentView, displayView } = useDisplayView({
    mobilePreviewShown,
    initialNavigationDoneRef,
    props
  });

  // Set up iframe message handling
  useIframeMessageHandler({
    navigateToView,
    setMobilePreviewShown,
    setIsIframeFetching,
    onPreviewLoaded: props.onPreviewLoaded,
    onScreenshotCaptured: props.onScreenshotCaptured,
    isStreaming: props.isStreaming
  });

  // Initial code loading - default to code view without changing URL
  useEffect(() => {
    // If it's the first load and we have code, show code view for initial load
    if (props.initialLoad !== false && props.code && props.code.length > 0) {
      initialNavigationDoneRef.current = true;
    }
  }, [props.initialLoad, props.code, initialNavigationDoneRef]);

  // Compute whether we should show welcome screen
  const showWelcome = !props.isStreaming && (!props.code || props.code.length === 0);

  // Calculate filesContent for iframe
  const filesContent = useMemo(() => {
    return {
      '/App.jsx': {
        code: props.code && !showWelcome ? props.code : '', // Use code if available, else empty string
        active: true,
      },
    };
  }, [props.code, showWelcome]);

  return {
    currentView,
    displayView,
    navigateToView,
    viewControls,
    showViewControls,
    sessionId,
    encodedTitle,
    mobilePreviewShown,
    setMobilePreviewShown,
    userClickedBack,
    setUserClickedBack,
    handleBackAction,
    isDarkMode,
    isIframeFetching,
    setIsIframeFetching,
    filesContent,
    showWelcome,
  };
}

// Export the hook with the original name
export const useViewState = useViewStateInternal;
