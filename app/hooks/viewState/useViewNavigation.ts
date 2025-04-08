import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ViewType } from './types';

type UseViewNavigationParams = {
  viewControls: {
    [key in ViewType]: {
      enabled: boolean;
    };
  };
  sessionId: string | undefined;
  encodedTitle: string;
  isStreaming: boolean;
  setMobilePreviewShown: (value: boolean) => void;
  setUserClickedBack: (value: boolean) => void;
};

// Hook for handling navigation between views
export function useViewNavigation({
  viewControls,
  sessionId,
  encodedTitle,
  isStreaming,
  setMobilePreviewShown,
  setUserClickedBack,
}: UseViewNavigationParams) {
  const navigate = useNavigate();

  // Handle back action 
  const handleBackAction = useCallback(() => {
    if (isStreaming) {
      setUserClickedBack(true);
    }
    setMobilePreviewShown(false);
  }, [isStreaming, setMobilePreviewShown, setUserClickedBack]);

  // Navigate to a view (explicit user action)
  const navigateToView = useCallback(
    (view: ViewType) => {
      // Always allow navigation to code view
      // For data view, only block during streaming
      // For preview, ensure preview is ready
      const shouldBlock = 
        (view === 'preview' && !viewControls[view].enabled) || 
        (view === 'data' && isStreaming);
      
      if (shouldBlock) return;

      // Always show mobile preview when changing views
      setMobilePreviewShown(true);

      // Reset userClickedBack when manually selecting a view
      if (isStreaming) {
        setUserClickedBack(false);
      }

      if (sessionId && encodedTitle) {
        const suffix = view === 'preview' ? 'app' : view;
        navigate(`/chat/${sessionId}/${encodedTitle}/${suffix}`);
      }
    },
    [viewControls, sessionId, encodedTitle, isStreaming, navigate, setMobilePreviewShown, setUserClickedBack]
  );

  return {
    navigateToView,
    handleBackAction
  };
}
