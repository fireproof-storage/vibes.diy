import React from 'react';
import { animationStyles } from './ResultPreviewTemplates';
import type { ResultPreviewProps } from './ResultPreviewTypes';
// Components
import IframeContent from './IframeContent';
// Context
import { useSharedViewState } from '../../context/ViewStateContext';

function ResultPreview({
  dependencies = {},
  onScreenshotCaptured,
  codeReady = false,
  children,
}: Partial<ResultPreviewProps> & { children?: React.ReactNode }) {
  // Consume shared state from context
  const { displayView, isDarkMode, filesContent, showWelcome } = useSharedViewState();

  const previewArea = showWelcome ? (
    <div className="h-full">{/* empty div to prevent layout shift */}</div>
  ) : (
    <IframeContent
      activeView={displayView}
      filesContent={filesContent}
      isStreaming={!codeReady}
      codeReady={codeReady}
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
