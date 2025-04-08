// Define common types used across view state hooks
export type ViewType = 'preview' | 'code' | 'data';

// Props for the ViewState hook
export type ViewStateProps = {
  sessionId?: string;
  title?: string;
  code: string;
  isStreaming: boolean;
  previewReady: boolean;
  isIframeFetching?: boolean;
  initialLoad?: boolean;
  // Mobile support
  isMobileView?: boolean;
  onBackClicked?: () => void;
  // Preview-related callbacks
  onPreviewLoaded?: () => void;
  onScreenshotCaptured?: (data: string | null) => void;
  // Code-related props
  codeReady?: boolean;
  dependencies?: Record<string, string>;
};

// Define the shape of the state returned by the hook
export type ViewState = {
  currentView: ViewType;
  displayView: ViewType;
  navigateToView: (view: ViewType) => void;
  viewControls: {
    preview: {
      enabled: boolean;
      icon: string;
      label: string;
      loading: boolean | undefined;
    };
    code: {
      enabled: boolean;
      icon: string;
      label: string;
      loading: boolean | undefined;
    };
    data: {
      enabled: boolean;
      icon: string;
      label: string;
      loading: boolean | undefined;
    };
  };
  showViewControls: boolean;
  sessionId: string | undefined;
  encodedTitle: string;
  mobilePreviewShown: boolean;
  setMobilePreviewShown: (mobilePreviewShown: boolean) => void;
  userClickedBack: boolean;
  setUserClickedBack: (userClickedBack: boolean) => void;
  handleBackAction: () => void;
  isDarkMode: boolean;
  isIframeFetching: boolean;
  setIsIframeFetching: (isIframeFetching: boolean) => void;
  filesContent: {
    '/App.jsx': {
      code: string;
      active: boolean;
    };
  };
  showWelcome: boolean;
};
