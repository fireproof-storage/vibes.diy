import type { RuntimeError } from '../../hooks/useRuntimeErrors';
import type { ViewType } from '../../utils/ViewState';

export interface ResultPreviewProps {
  code: string;
  dependencies?: Record<string, string>;
  onScreenshotCaptured?: (screenshotData: string | null) => void;
  sessionId?: string;
  title?: string;
  isStreaming?: boolean;
  codeReady?: boolean;
  displayView: ViewType; // Changed from activeView
  // setActiveView: (view: 'code' | 'preview' | 'data') => void; // Removed
  onPreviewLoaded: () => void;
  setMobilePreviewShown: (shown: boolean) => void;
  setIsIframeFetching?: (fetching: boolean) => void;
  addError?: (error: RuntimeError) => void; // Single error handler for all types of errors
}

export type IframeFiles = Record<
  string,
  {
    code: string;
    hidden?: boolean;
    active?: boolean;
  }
>;
