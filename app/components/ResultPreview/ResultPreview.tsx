import React from 'react';
import { animationStyles } from './ResultPreviewTemplates';
import type { ResultPreviewProps } from './ResultPreviewTypes';
// Components
import IframeContent from './IframeContent';
// Context
import { useSharedViewState } from '../../context/ViewStateContext';

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
  // Consume shared state from context
  const { displayView, isDarkMode, filesContent, showWelcome, isIframeFetching } =
    useSharedViewState();

  // For backwards compatibility, sync with any parent state
  // TODO: Remove these effects and the props (`activeView`, `setActiveView`, `setIsIframeFetching`)
  // once all consuming components fully rely on the context.
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
      dependencies={dependencies} // Pass dependencies down
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
