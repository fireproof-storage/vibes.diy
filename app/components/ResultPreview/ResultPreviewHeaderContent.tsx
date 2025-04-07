import React from 'react';
import { useViewState } from '../../utils/ViewState';
import type { ViewType } from '../../utils/ViewState';
import {
  PreviewIcon,
  CodeIcon,
  DataIcon,
  ShareIcon,
  BackArrowIcon,
} from '../HeaderContent/SvgIcons';

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
}) => {
  // Use the new ViewState hook to manage all view-related state and navigation
  const {
    currentView,
    displayView,
    navigateToView,
    viewControls,
    showViewControls,
    sessionId,
    encodedTitle,
  } = useViewState({
    sessionId: propSessionId,
    title: propTitle,
    code,
    isStreaming,
    previewReady,
    isIframeFetching,
  });

  // When displayView changes, update activeView to match
  React.useEffect(() => {
    if (activeView !== displayView) {
      setActiveView(displayView);
    }
  }, [displayView, activeView, setActiveView]);

  // This effect has been replaced by the displayView from useViewState hook
  // The hook now handles the logic of showing code view during streaming

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
          className="bg-light-decorative-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center justify-center rounded-lg p-2 transition-colors md:hidden"
          aria-label="Back to chat"
        >
          <BackArrowIcon />
        </button>

        {showViewControls ? null : <div className="h-10"></div>}
      </div>

      {/* Center buttons */}
      <div className="flex w-2/4 items-center justify-center">
        {showViewControls ? (
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex justify-center gap-1 rounded-lg p-1 shadow-sm">
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
                    className="text-light-primary/50 dark:text-dark-primary/50 flex cursor-not-allowed items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium opacity-50 transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm"
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
                    className={`flex items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm ${
                      isActive
                        ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                        : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
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
                  className={`flex items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm ${
                    isActive
                      ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                      : 'text-light-primary dark:text-dark-primary' +
                        (control.enabled
                          ? ' hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
                          : ' cursor-not-allowed opacity-50')
                  }`}
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
      <div className="flex w-1/4 justify-end">
        {showViewControls ? (
          <div className="flex items-center gap-2">
            <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex justify-center gap-1 rounded-lg p-1 shadow-sm">
              <a
                href="https://connect.fireproof.storage/login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm"
                aria-label="Connect"
              >
                <ShareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden min-[480px]:inline">Share</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="h-10 w-10"></div>
        )}
      </div>
    </div>
  );
};

export default ResultPreviewHeaderContent;
