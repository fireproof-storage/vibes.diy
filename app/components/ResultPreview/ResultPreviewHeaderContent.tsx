import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { encodeTitle } from '../SessionSidebar/utils';

interface ResultPreviewHeaderContentProps {
  previewReady: boolean;
  activeView: 'preview' | 'code' | 'data';
  setActiveView: (view: 'preview' | 'code' | 'data') => void;
  isStreaming: boolean;
  code: string;
  setMobilePreviewShown: (shown: boolean) => void;
  dependencies?: Record<string, string>;
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
  sessionId: propSessionId,
  title: propTitle,
  isIframeFetching = false,
}) => {
  const navigate = useNavigate();
  const { sessionId: paramSessionId, title: paramTitle } = useParams<{
    sessionId: string;
    title: string;
  }>();

  // Use props if provided, otherwise use params from the URL
  const sessionId = propSessionId || paramSessionId;
  const title = propTitle || paramTitle;

  // Ensure we have a properly encoded title for URL paths
  const encodedTitle = title ? encodeTitle(title) : '';
  const showSwitcher = code.length > 0;

  // Determine active tab directly from URL path to prevent flashing
  const getPathView = () => {
    const path = window.location.pathname;
    if (path.endsWith('/app')) return 'preview';
    if (path.endsWith('/code')) return 'code';
    if (path.endsWith('/data')) return 'data';
    return activeView; // Fall back to state if no match
  };

  const pathView = getPathView();

  return (
    <div className="flex h-full w-full items-center px-2 py-4">
      <div className="flex w-1/4 items-center justify-start">
        <button
          type="button"
          onClick={() => setMobilePreviewShown(false)}
          className="bg-light-decorative-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center justify-center rounded-lg p-2 transition-colors md:hidden"
          aria-label="Back to chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {showSwitcher ? null : <div className="h-10"></div>}
      </div>

      {/* Center buttons */}
      <div className="flex w-2/4 items-center justify-center">
        {showSwitcher ? (
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex justify-center gap-1 rounded-lg p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setActiveView('preview');
                if (sessionId && encodedTitle) {
                  navigate(`/chat/${sessionId}/${encodedTitle}/app`);
                }
              }}
              className={`flex items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm ${
                pathView === 'preview'
                  ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-light-primary dark:text-dark-primary' +
                    (previewReady
                      ? ' hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
                      : ' cursor-not-allowed opacity-50')
              }`}
              aria-label="Switch to preview"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${isIframeFetching ? 'animate-spin-slow' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>{isIframeFetching ? 'App is fetching data' : 'Preview icon'}</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span className="hidden min-[480px]:inline">App</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeView !== 'code') {
                  setActiveView('code');
                  if (sessionId && encodedTitle) {
                    navigate(`/chat/${sessionId}/${encodedTitle}/code`);
                  }
                }
              }}
              className={`flex items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm ${
                pathView === 'code'
                  ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
              }`}
              aria-label="Switch to code editor"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isStreaming && !previewReady ? 'animate-spin-slow' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Code icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <span className="hidden min-[480px]:inline">Code</span>
            </button>
            {isStreaming ? (
              <button
                type="button"
                disabled={true}
                className="text-light-primary/50 dark:text-dark-primary/50 flex cursor-not-allowed items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium opacity-50 transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm"
                aria-label="Data tab unavailable during streaming"
                title="Data tab available after streaming completes"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 opacity-50 sm:h-4 sm:w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Data icon</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 15h5m-5-4h10"
                  />
                </svg>
                <span className="hidden min-[480px]:inline">Data</span>
              </button>
            ) : (
              <a
                href={sessionId && encodedTitle ? `/chat/${sessionId}/${encodedTitle}/data` : '#'}
                className={`flex items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm ${
                  pathView === 'data'
                    ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                    : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
                }`}
                aria-label="Switch to data viewer"
                title="View database data"
                onClick={() => {
                  // Just set the active view locally - navigation will happen via browser
                  if (activeView !== 'data') {
                    setActiveView('data');
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isStreaming ? 'opacity-50' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Data icon</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 15h5m-5-4h10"
                  />
                </svg>
                <span className="hidden min-[480px]:inline">Data</span>
              </a>
            )}
          </div>
        ) : null}
      </div>

      {/* Right side */}
      <div className="flex w-1/4 justify-end">
        {code ? (
          <div className="flex items-center gap-2">
            <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex justify-center gap-1 rounded-lg p-1 shadow-sm">
              <a
                href="https://connect.fireproof.storage/login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center justify-center space-x-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm"
                aria-label="Connect"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Connect icon</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
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
