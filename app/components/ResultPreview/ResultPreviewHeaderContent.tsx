import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useSession } from '../../hooks/useSession';
import type { ViewType } from '../../utils/ViewState';
import { useViewState } from '../../utils/ViewState';
import { BackButton } from './BackButton';
import { ViewControls } from './ViewControls';
import { PublishButton } from './PublishButton';
import { usePublish } from './usePublish';

interface ResultPreviewHeaderContentProps {
  previewReady: boolean;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isStreaming: boolean;
  code: string;
  setMobilePreviewShown: (shown: boolean) => void;
  setUserClickedBack?: (clicked: boolean) => void;
  sessionId?: string;
  title?: string;
  isIframeFetching?: boolean;
  needsLogin?: boolean;
}

const ResultPreviewHeaderContent: React.FC<ResultPreviewHeaderContentProps> = ({
  previewReady,
  activeView,
  setActiveView,
  isStreaming,
  code,
  setMobilePreviewShown,
  setUserClickedBack,
  sessionId: propSessionId,
  title: propTitle,
  isIframeFetching = false,
  needsLogin = false,
}) => {
  const { sessionId: urlSessionId, view: urlView } = useParams();
  const publishButtonRef = useRef<HTMLButtonElement>(null);

  // Use props if provided, otherwise use params from the URL
  const sessionId = propSessionId || urlSessionId;
  const title = propTitle || urlView;

  // Use the session hook to get and update session data
  const { session, docs: messages, updatePublishedUrl } = useSession(sessionId);

  // Use the new ViewState hook to manage all view-related state and navigation
  const { currentView, displayView, viewControls, showViewControls } = useViewState({
    sessionId,
    title,
    code,
    isStreaming,
    previewReady,
    isIframeFetching,
  });

  // When displayView changes, update activeView to match
  useEffect(() => {
    if (activeView !== displayView) {
      setActiveView(displayView);
    }
  }, [displayView, activeView, setActiveView]);

  // Use the custom hook for publish functionality
  const { isPublishing, urlCopied, handlePublish } = usePublish({
    sessionId,
    code,
    title,
    messages,
    updatePublishedUrl,
    publishedUrl: session.publishedUrl,
  });

  return (
    <div className="flex h-full w-full items-center px-2 py-4">
      <div className="flex w-1/4 items-center justify-start">
        <BackButton
          onBackClick={() => {
            // Tell parent component user explicitly clicked back
            if (isStreaming && setUserClickedBack) {
              setUserClickedBack(true);
            }
            // Force showing the chat panel immediately
            setMobilePreviewShown(false);
          }}
        />

        {showViewControls ? null : <div className="h-10" />}
      </div>

      {/* Center - View controls */}
      <div className="flex w-1/2 items-center justify-center">
        {showViewControls && <ViewControls viewControls={viewControls} currentView={currentView} />}
      </div>
      {/* Right side - Publish button */}
      <div className="flex w-1/4 items-center justify-end">
        <div className="flex items-center">
          {showViewControls && previewReady && (
            <div className="mr-2">
              <PublishButton
                ref={publishButtonRef}
                onClick={handlePublish}
                isPublishing={isPublishing}
                urlCopied={urlCopied}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultPreviewHeaderContent;
