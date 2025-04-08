import React from 'react';
import { animationStyles } from './ResultPreviewTemplates';
import type { ResultPreviewProps } from './ResultPreviewTypes';
// Components
import IframeContent from './IframeContent';
// State management
import { useViewState } from '../../utils/ViewState';

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
  setIsIframeFetching,
  children,
  title,
}: ResultPreviewProps & { children?: React.ReactNode }) {
  // Use the centralized ViewState hook for all view-related state management
  const { displayView, isDarkMode, filesContent, showWelcome, isIframeFetching } = useViewState({
    sessionId,
    title,
    code,
    isStreaming,
    previewReady: codeReady,
    onPreviewLoaded,
    onScreenshotCaptured,
    codeReady,
    dependencies,
  });

  // For backwards compatibility, sync with any parent state
  React.useEffect(() => {
    if (setActiveView && displayView !== activeView) {
      setActiveView(displayView);
    }
  }, [displayView, activeView, setActiveView]);

  React.useEffect(() => {
    if (setIsIframeFetching) {
      setIsIframeFetching(isIframeFetching);
    }
  }, [isIframeFetching, setIsIframeFetching]);

  const previewArea = showWelcome ? (
    <div className="h-full">{/* empty div to prevent layout shift */}</div>
  ) : (
    <IframeContent
      activeView={displayView} // Use displayView from ViewState
      filesContent={filesContent}
      isStreaming={!codeReady}
      codeReady={codeReady}
      setActiveView={setActiveView} // Keep for backwards compatibility
      dependencies={dependencies}
      isDarkMode={isDarkMode}
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
