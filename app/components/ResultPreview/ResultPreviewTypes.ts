import type { RuntimeError } from '../../hooks/useRuntimeErrors';

export interface ResultPreviewProps {
  code: string;
  dependencies?: Record<string, string>;
  onScreenshotCaptured?: (screenshotData: string | null) => void;
  sessionId?: string;
  title?: string;
  isStreaming?: boolean;
  codeReady?: boolean;
  activeView: 'code' | 'preview' | 'data';
  setActiveView: (view: 'code' | 'preview' | 'data') => void;
  onPreviewLoaded: () => void;
  setMobilePreviewShown: (shown: boolean) => void;
  setIsIframeFetching?: (fetching: boolean) => void;
  addError?: (error: RuntimeError) => void; // Single error handler for all types of errors
}

export type IframeFiles = {
  [path: string]: {
    code: string;
    hidden?: boolean;
    active?: boolean;
  };
};
