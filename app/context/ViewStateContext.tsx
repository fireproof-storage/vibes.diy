import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useViewState } from '../utils/ViewState';
import type { ViewState } from '../utils/ViewState';

// Define the props that the Provider will need to initialize the hook
interface ViewStateProviderProps {
  children: ReactNode;
  initialProps: {
    sessionId?: string;
    title?: string;
    code: string;
    isStreaming: boolean;
    previewReady: boolean;
    isIframeFetching?: boolean;
    initialLoad?: boolean;
    isMobileView?: boolean;
    onBackClicked?: () => void;
    onPreviewLoaded?: () => void;
    onScreenshotCaptured?: (data: string | null) => void;
    codeReady?: boolean;
    dependencies?: Record<string, string>;
  };
}

// Create the context with a default value (can be null or a default state object)
// Using null and checking for it in the consumer hook is a common pattern
const ViewStateContext = createContext<ViewState | null>(null);

// Create the Provider component
export const ViewStateProvider: React.FC<ViewStateProviderProps> = ({ children, initialProps }) => {
  const viewState = useViewState(initialProps);

  return <ViewStateContext.Provider value={viewState}>{children}</ViewStateContext.Provider>;
};

// Create a custom hook to consume the context easily and safely
export const useSharedViewState = (): ViewState => {
  const context = useContext(ViewStateContext);
  if (context === null) {
    throw new Error('useSharedViewState must be used within a ViewStateProvider');
  }
  return context;
};
