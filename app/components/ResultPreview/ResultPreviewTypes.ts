export interface ResultPreviewProps {
  code: string;
  dependencies?: Record<string, string>;
  onShare?: () => void;
  onScreenshotCaptured?: (screenshotData: string) => void;
  initialView?: 'code' | 'preview';
  sessionId?: string;
  isStreaming?: boolean;
}

export type SandpackFiles = {
  [path: string]: {
    code: string;
    hidden?: boolean;
    active?: boolean;
  };
};
