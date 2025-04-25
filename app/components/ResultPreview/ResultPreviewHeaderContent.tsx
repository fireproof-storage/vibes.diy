import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useSession } from '../../hooks/useSession';
import type { ViewType } from '../../utils/ViewState';
import { useViewState } from '../../utils/ViewState';
import {
  BackArrowIcon,
  CodeIcon,
  DataIcon,
  PreviewIcon,
  PublishIcon,
} from '../HeaderContent/SvgIcons';
import { publishApp } from '../../utils/publishUtils';
import { trackPublishClick } from '../../utils/analytics';

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

  const [isPublishing, setIsPublishing] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const publishButtonRef = useRef<HTMLButtonElement>(null);

  // Use props if provided, otherwise use params from the URL
  const sessionId = propSessionId || urlSessionId;
  const title = propTitle || urlView;

  // Use the session hook to get and update session data
  const { session, docs: messages, updatePublishedUrl } = useSession(sessionId);

  // Initialize publishedAppUrl from session data if available
  // This is used in handlePublish for copying to clipboard and analytics
  const [publishedAppUrl, setPublishedAppUrl] = useState<string | undefined>(session.publishedUrl);

  // Update publishedAppUrl when session data changes
  useEffect(() => {
    if (session.publishedUrl) {
      setPublishedAppUrl(session.publishedUrl);
    }
  }, [session.publishedUrl]);

  useEffect(() => {
    if (publishedAppUrl) {
      console.debug('Published URL updated:', publishedAppUrl);
    }
  }, [publishedAppUrl]);

  // Use the new ViewState hook to manage all view-related state and navigation
  const { currentView, displayView, navigateToView, viewControls, showViewControls, encodedTitle } =
    useViewState({
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

  const handlePublish = async () => {
    setIsPublishing(true);
    setUrlCopied(false);
    try {
      if (messages.length === 0) {
        setIsPublishing(false);
        return;
      }
      let prompt = messages[0].text;

      const userMessages = messages.filter((message) => message.type === 'user');

      if (userMessages.length > 1) {
        if (userMessages[0]._id === '0001-user-first') {
          prompt = userMessages[1].text;
        }
      }

      const appUrl = await publishApp({
        sessionId,
        code,
        title,
        prompt,
        updatePublishedUrl,
      });

      if (appUrl) {
        setPublishedAppUrl(appUrl);
        // Copy the URL to clipboard
        await navigator.clipboard.writeText(appUrl);
        setUrlCopied(true);
        // Trigger analytics
        trackPublishClick({ publishedAppUrl: appUrl });

        // Reset the button state after 3 seconds
        setTimeout(() => {
          setUrlCopied(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error in handlePublish:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center px-2 py-4">
      <div className="flex w-1/4 items-center justify-start">
        <button
          type="button"
          onClick={() => {
            // Tell parent component user explicitly clicked back
            if (isStreaming && setUserClickedBack) {
              setUserClickedBack(true);
            }
            // Force showing the chat panel immediately
            setMobilePreviewShown(false);
          }}
          className="bg-light-decorative-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center justify-center rounded-md p-2 transition-colors md:hidden"
          aria-label="Back to chat"
        >
          <BackArrowIcon />
        </button>

        {showViewControls ? null : <div className="h-10" />}
      </div>

      {/* Center buttons */}
      <div className="flex w-2/4 items-center justify-center">
        {showViewControls ? (
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex justify-center gap-1 rounded-md p-1 shadow-sm">
            {/* Map over view controls to create buttons */}
            {Object.entries(viewControls).map(([view, control]) => {
              const viewType = view as ViewType;
              // Use displayView instead of currentView to determine active state
              // displayView will show code during streaming but respect URL otherwise
              const isActive = displayView === viewType;

              // Handle special case for data view with streaming state
              if (viewType === 'data' && isStreaming) {
                return (
                  <button
                    key={viewType}
                    type="button"
                    disabled={true}
                    className="text-light-primary/50 dark:text-dark-primary/50 !pointer-events-none flex cursor-not-allowed items-center justify-center space-x-1 rounded px-3 py-1.5 text-xs font-medium opacity-50 transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm"
                    aria-label="Data tab unavailable during streaming"
                    title="Data tab available after streaming completes"
                  >
                    <DataIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden min-[480px]:inline">{control.label}</span>
                  </button>
                );
              }

              // For data view when not streaming, use an anchor tag
              if (viewType === 'data' && !isStreaming) {
                return (
                  <a
                    key={viewType}
                    href={
                      sessionId && encodedTitle ? `/chat/${sessionId}/${encodedTitle}/data` : '#'
                    }
                    className={`flex items-center justify-center space-x-1 rounded px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm ${
                      isActive
                        ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                        : 'text-light-primary/90 dark:text-dark-primary/90 hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 hover:text-light-primary dark:hover:text-dark-primary'
                    }`}
                    aria-label={`Switch to ${control.label} viewer`}
                    title={`View ${control.label.toLowerCase()}`}
                    onClick={() => {
                      if (activeView !== viewType) {
                        setActiveView(viewType);
                        // Ensure the preview is shown on mobile when the data view is clicked
                        setMobilePreviewShown(true);

                        // Reset userClickedBack when a user manually clicks data view during streaming
                        if (isStreaming && setUserClickedBack) {
                          setUserClickedBack(false);
                        }
                      }
                    }}
                  >
                    <DataIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden min-[480px]:inline">{control.label}</span>
                  </a>
                );
              }

              // For all other cases, use a button
              return (
                <button
                  key={viewType}
                  type="button"
                  onClick={() => {
                    // Set the active view and navigate
                    setActiveView(viewType);

                    // During streaming, we should still update the route
                    // but override the display with code view
                    navigateToView(viewType);

                    // Always show the mobile preview when clicking a view button
                    setMobilePreviewShown(true);

                    // Reset userClickedBack when a user manually clicks a view button during streaming
                    // This ensures they can get back to the preview/code even after clicking back
                    if (isStreaming && setUserClickedBack) {
                      setUserClickedBack(false);
                    }
                  }}
                  className={`flex items-center justify-center space-x-1 rounded px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm ${
                    isActive
                      ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                      : `text-light-primary/90 dark:text-dark-primary/90 ${
                          control.enabled
                            ? 'hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 hover:text-light-primary dark:hover:text-dark-primary'
                            : 'opacity-50'
                        }`
                  } ${!control.enabled ? '!pointer-events-none cursor-not-allowed' : ''}`}
                  disabled={!control.enabled}
                  aria-label={`Switch to ${control.label}`}
                >
                  {viewType === 'preview' && (
                    <PreviewIcon
                      className="h-4 w-4"
                      isLoading={!!control.loading}
                      title={control.loading ? 'App is fetching data' : 'Preview icon'}
                    />
                  )}
                  {viewType === 'code' && (
                    <CodeIcon
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      isLoading={currentView === 'preview' && !!control.loading}
                    />
                  )}
                  {viewType === 'data' && <DataIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  <span className="hidden min-[480px]:inline">{control.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Right side */}
      <div className="flex w-1/4 items-center justify-end">
        <div className="flex items-center">
          {/* Publish button */}
          {showViewControls && previewReady && (
            <div className="mr-2">
              <button
                ref={publishButtonRef}
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-glimmer text-light-primary dark:text-dark-primary flex items-center justify-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-50 max-[767px]:aspect-square max-[767px]:p-2 min-[768px]:w-auto dark:border-gray-700"
                aria-label={urlCopied ? 'URL copied to clipboard' : 'Publish'}
                title={urlCopied ? 'URL copied to clipboard' : 'Share with the world'}
              >
                {isPublishing ? (
                  <svg
                    className="text-light-primary dark:text-dark-primary h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-label="Publishing in progress"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : urlCopied ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-label="URL copied to clipboard"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <PublishIcon className="h-5 w-5" />
                )}
                <span className="hidden text-xs whitespace-nowrap min-[1024px]:inline">
                  {urlCopied ? 'URL copied' : 'Share'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultPreviewHeaderContent;
