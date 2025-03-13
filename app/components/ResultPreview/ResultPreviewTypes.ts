export interface ResultPreviewProps {
  code: string;
  dependencies?: Record<string, string>;
  onScreenshotCaptured?: (screenshotData: string) => void;
  initialView?: 'code' | 'preview';
  sessionId?: string;
  isStreaming?: boolean;
  codeReady?: boolean;
}

export type SandpackFiles = {
  [path: string]: {
    code: string;
    hidden?: boolean;
    active?: boolean;
  };
};
