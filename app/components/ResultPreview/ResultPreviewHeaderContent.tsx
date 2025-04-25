import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useSession } from '../../hooks/useSession';
import type { ViewType } from '../../utils/ViewState';
import { useViewState } from '../../utils/ViewState';
import { BackButton } from './BackButton';
import { ViewControls } from './ViewControls';
import { PublishButton } from './PublishButton';
import { usePublish } from './usePublish';
import { BackArrowIcon } from '../HeaderContent/SvgIcons';

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
  const { currentView, displayView, viewControls, showViewControls, encodedTitle } = useViewState({
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
      {/* Left side - Back button */}
      <div className="flex w-1/4 items-center justify-start">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={() => {
            setMobilePreviewShown(false);
            if (setUserClickedBack) {
              setUserClickedBack(true);
            }
          }}
          className="bg-light-decorative-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center justify-center rounded-md p-2 transition-colors md:hidden"
          aria-label="Back to chat"
        >
          <BackArrowIcon />
        </button>

        {/* Desktop back button */}
        {showViewControls && (
          <BackButton
            onBackClick={() => {
              setMobilePreviewShown(false);
              if (setUserClickedBack) {
                setUserClickedBack(true);
              }
              // Navigate back to chat interface without using navigateToView
              const basePath = `/chat/${sessionId}/${encodedTitle || ''}`;
              window.location.href = basePath;
            }}
            encodedTitle={encodedTitle || ''}
          />
        )}
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
