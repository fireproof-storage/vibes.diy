import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useSession } from '../../hooks/useSession';
import type { ViewType } from '../../utils/ViewState';
import { useViewState } from '../../utils/ViewState';
import { type TokenPayload, initiateAuthFlow, parseToken, verifyToken } from '../../utils/auth';
import {
  BackArrowIcon,
  CodeIcon,
  DataIcon,
  PreviewIcon,
  UserIcon,
} from '../HeaderContent/SvgIcons';
import { PublishMenu } from '../PublishMenu';
import { UserMenu } from '../UserMenu';
import { publishApp } from '../../utils/publishUtils';
import { trackAuthClick } from '../../utils/analytics';

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
  const [userInfo, setUserInfo] = useState<TokenPayload | null>(null);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPublishMenuOpen, setIsPublishMenuOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const publishButtonRef = useRef<HTMLButtonElement>(null);

  // Use props if provided, otherwise use params from the URL
  const sessionId = propSessionId || urlSessionId;
  const title = propTitle || urlView;

  // Use the session hook to get and update session data
  const { session, updatePublishedUrl } = useSession(sessionId);

  // Initialize publishedAppUrl from session data if available
  const [publishedAppUrl, setPublishedAppUrl] = useState<string | undefined>(session.publishedUrl);

  // Update publishedAppUrl when session data changes
  useEffect(() => {
    if (session.publishedUrl) {
      setPublishedAppUrl(session.publishedUrl);
    }
  }, [session.publishedUrl]);

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

  useEffect(() => {
    const checkAuth = async () => {
      setIsVerifying(true);
      try {
        const token = localStorage.getItem('auth_token');

        // If we have a token and it's valid, use it
        if (token && (await verifyToken(token))) {
          const payload = parseToken(token);
          if (payload && payload.exp > Date.now()) {
            setUserInfo(payload);
            setIsUserAuthenticated(true);
            setIsVerifying(false);
            return;
          }
        }

        // Token is missing, invalid, or expired - show Connect button

        localStorage.removeItem('auth_token');
        setIsUserAuthenticated(false);
      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('auth_token');
        setIsUserAuthenticated(false);
      } finally {
        setIsVerifying(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthCheck = async () => {
    if (isVerifying) return; // Prevent action while verifying

    // Track Share/Get Credits click
    trackAuthClick({
      label: needsLogin ? 'Get Credits' : 'Share',
      isUserAuthenticated,
      userId: userInfo?.userId,
    });

    if (isUserAuthenticated) {
      setIsMenuOpen((open) => !open);
    } else {
      // Use the dedicated function to initiate auth flow
      initiateAuthFlow();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsUserAuthenticated(false);
    setIsMenuOpen(false);
  };

  const handlePublish = async () => {
    try {
      const appUrl = await publishApp({
        sessionId,
        code,
        title,
        updatePublishedUrl,
      });

      if (appUrl) {
        setPublishedAppUrl(appUrl);
      }
    } catch (error) {
      console.error('Error in handlePublish:', error);
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
                    className="text-light-primary/50 dark:text-dark-primary/50 flex cursor-not-allowed items-center justify-center space-x-1 rounded px-3 py-1.5 text-xs font-medium opacity-50 transition-colors sm:space-x-1.5 sm:px-4 sm:text-sm"
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
                            : 'cursor-not-allowed opacity-50'
                        }`
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
        <div className="flex items-center gap-2">
          {isUserAuthenticated && showViewControls && previewReady && (
            <div className="relative">
              <button
                ref={publishButtonRef}
                type="button"
                onClick={() => setIsPublishMenuOpen(!isPublishMenuOpen)}
                className="bg-light-decorative-00 border-glimmer dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 -mt-4.5 -ml-10 flex items-center justify-center rounded-md p-2 transition-colors"
                aria-label="Publish"
                title="Publish"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-labelledby="publishSvgTitle"
                >
                  <title id="publishSvgTitle">Publish</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
              <PublishMenu
                isOpen={isPublishMenuOpen}
                onPublish={handlePublish}
                onClose={() => setIsPublishMenuOpen(false)}
                buttonRef={publishButtonRef}
                publishedAppUrl={publishedAppUrl}
              />
            </div>
          )}
          <div className="relative">
            <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex justify-center gap-1 rounded-md p-1 shadow-sm">
              <button
                ref={buttonRef}
                type="button"
                onClick={handleAuthCheck}
                disabled={isVerifying}
                className={`${needsLogin ? 'text-orange-500' : 'text-light-primary dark:text-dark-primary'} hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center justify-center space-x-1 rounded px-2 py-1.5 text-xs font-medium transition-colors sm:space-x-1.5 sm:px-1.5 sm:text-sm ${isVerifying ? 'cursor-wait opacity-50' : ''}`}
                aria-label={isUserAuthenticated ? `User: ${userInfo?.userId}` : 'Connect Account'}
                title={
                  isUserAuthenticated
                    ? `Logged in as ${userInfo?.userId}`
                    : 'Login with Fireproof to Publish'
                }
              >
                <UserIcon isVerifying={isVerifying} isUserAuthenticated={isUserAuthenticated} />
                <span className="hidden min-[480px]:inline">
                  {isVerifying
                    ? 'Verifying...'
                    : isUserAuthenticated
                      ? ''
                      : needsLogin
                        ? 'Get Credits'
                        : 'Share'}
                </span>
              </button>
            </div>

            <UserMenu
              isOpen={isMenuOpen && isUserAuthenticated}
              onLogout={handleLogout}
              onClose={() => setIsMenuOpen(false)}
              buttonRef={buttonRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPreviewHeaderContent;
