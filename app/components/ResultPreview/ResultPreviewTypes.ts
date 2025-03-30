export interface ResultPreviewProps {
  code: string;
  dependencies?: Record<string, string>;
  onScreenshotCaptured?: (screenshotData: string | null) => void;
  sessionId?: string;
  isStreaming?: boolean;
  codeReady?: boolean;
  activeView: 'code' | 'preview' | 'data';
  setActiveView: (view: 'code' | 'preview' | 'data') => void;
  onPreviewLoaded: () => void;
  setMobilePreviewShown: (shown: boolean) => void;
}

export type IframeFiles = {
  [path: string]: {
    code: string;
    hidden?: boolean;
    active?: boolean;
  };
};
