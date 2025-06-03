import { /*useEffect,*/ useRef } from 'react'; // useEffect no longer needed here
import { useParams } from 'react-router';
import { useSession } from '../../hooks/useSession';
import type { ViewType, ViewControlsType } from '../../utils/ViewState';
// import { useViewState } from '../../utils/ViewState'; // useViewState is now lifted to home.tsx
import { BackButton } from './BackButton';
import { ViewControls } from './ViewControls';
import { PublishButton } from './PublishButton';
import { usePublish } from './usePublish';
import { ShareModal } from './ShareModal';

interface ResultPreviewHeaderContentProps {
  // Props from useViewState (lifted to home.tsx)
  displayView: ViewType;
  navigateToView: (view: ViewType) => void;
  viewControls: ViewControlsType;
  showViewControls: boolean;
  previewReady: boolean;
  setMobilePreviewShown: (shown: boolean) => void;
  setUserClickedBack?: (clicked: boolean) => void;

  // Props required by usePublish and useSession hooks, and for BackButton logic
  code: string; // for usePublish
  isStreaming: boolean; // for BackButton logic
  sessionId?: string; // for useSession, usePublish
  title?: string; // for useSession, usePublish
}

const ResultPreviewHeaderContent: React.FC<ResultPreviewHeaderContentProps> = ({
  displayView,
  navigateToView,
  viewControls,
  showViewControls,
  previewReady,
  setMobilePreviewShown,
  setUserClickedBack,
  code,
  isStreaming,
  sessionId: propSessionId,
  title: propTitle,
}) => {
  const { sessionId: urlSessionId, view: urlView } = useParams();
  const publishButtonRef = useRef<HTMLButtonElement>(null);

  // Use props if provided, otherwise use params from the URL
  const sessionId = propSessionId || urlSessionId;
  const title = propTitle || urlView;

  // Use the session hook to get and update session data
  const { session, docs: messages, updatePublishedUrl } = useSession(sessionId);

  // useViewState is now lifted, props like displayView, navigateToView, viewControls, showViewControls are passed in.
  // The useEffect syncing activeView with displayView is no longer needed.

  // Use the custom hook for publish functionality
  const {
    isPublishing,
    urlCopied,
    publishedAppUrl,
    handlePublish,
    toggleShareModal,
    isShareModalOpen,
    setIsShareModalOpen,
  } = usePublish({
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
        {showViewControls && (
          <ViewControls
            viewControls={viewControls}
            currentView={displayView} // Use displayView for the currently active button highlight
            onClick={navigateToView}
          />
        )}
      </div>
      {/* Right side - Publish button */}
      <div className="flex w-1/4 items-center justify-end">
        <div className="flex items-center">
          {showViewControls && previewReady && (
            <div className="mr-2">
              <PublishButton
                ref={publishButtonRef}
                onClick={toggleShareModal}
                isPublishing={isPublishing}
                urlCopied={urlCopied}
                hasPublishedUrl={!!publishedAppUrl}
              />
            </div>
          )}
        </div>
      </div>
      {/* Share Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          buttonRef={publishButtonRef}
          publishedAppUrl={publishedAppUrl}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      )}
    </div>
  );
};

export default ResultPreviewHeaderContent;
