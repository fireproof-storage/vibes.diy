import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { SessionSidebarProps } from '../types/chat';
import { trackAuthClick } from '../utils/analytics';
import { initiateAuthFlow, pollForAuthToken } from '../utils/auth';
import { UserIcon } from './HeaderContent/SvgIcons';
import { GearIcon } from './SessionSidebar/GearIcon';
import { HomeIcon } from './SessionSidebar/HomeIcon';
import { InfoIcon } from './SessionSidebar/InfoIcon';
import { StarIcon } from './SessionSidebar/StarIcon';
import VibesDIYLogo from './VibesDIYLogo';

/**
 * Component that displays a navigation sidebar with menu items
 */
function SessionSidebar({ isVisible, onClose }: SessionSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, isLoading, userPayload } = useAuth();
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  // Listen for the needsLoginTriggered event to update needsLogin state
  useEffect(() => {
    const handleNeedsLoginTriggered = () => {
      setNeedsLogin(true);
    };

    // Add event listener
    window.addEventListener('needsLoginTriggered', handleNeedsLoginTriggered);

    // Cleanup
    return () => {
      window.removeEventListener('needsLoginTriggered', handleNeedsLoginTriggered);
    };
  }, []);

  // Handle clicks outside the sidebar to close it
  useEffect(() => {
    if (!isVisible) return;

    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Conditionally render content but keep animation classes
  return (
    <div
      ref={sidebarRef}
      data-testid="session-sidebar"
      className={`bg-light-background-00 dark:bg-dark-background-00 fixed top-0 left-0 z-10 h-full shadow-lg transition-all duration-300 ${
        isVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
      }`}
    >
      <div className="flex h-full flex-col overflow-auto">
        <div className="border-light-decorative-01 dark:border-dark-decorative-00 flex items-center justify-between border-b p-4">
          <VibesDIYLogo width={100} className="pointer-events-none -mt-18 -mb-20 -ml-2" />

          <button
            type="button"
            onClick={onClose}
            className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark"
            aria-label="Close sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-grow p-2">
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                onClick={() => onClose()}
                className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
              >
                <HomeIcon className="text-accent-01 mr-3 h-5 w-5" />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link
                to="/vibes/mine"
                onClick={() => onClose()}
                className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
              >
                <StarIcon className="text-accent-01 mr-3 h-5 w-5" />
                <span>My Vibes</span>
              </Link>
            </li>
            <li>
              {isLoading ? (
                <div className="flex items-center rounded-md px-4 py-3 text-sm font-medium text-gray-400">
                  <UserIcon className="text-accent-01 mr-3 h-5 w-5 animate-pulse" isUserAuthenticated={false} isVerifying={true} />
                  <span className="animate-pulse">Loading...</span>
                </div>
              ) : isAuthenticated ? (
                <Link
                  to="/settings"
                  onClick={() => onClose()}
                  className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
                >
                  <GearIcon className="text-accent-01 mr-3 h-5 w-5" />
                  <span>Settings</span>
                </Link>
              ) : needsLogin ? (
                <button
                  type="button"
                  onClick={() => {
                    trackAuthClick({ label: 'Get Credits' });
                    initiateAuthFlow();
                    setNeedsLogin(false);
                    onClose();
                  }}
                  className="flex w-full items-center rounded-md bg-orange-500 px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-orange-600 dark:hover:bg-orange-600"
                >
                  <UserIcon
                    className="mr-3 h-5 w-5 text-white"
                    isUserAuthenticated={false}
                    isVerifying={false}
                  />
                  <span>Get Credits</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    trackAuthClick();
                    const auth = initiateAuthFlow();

                    if (auth && auth.connectUrl && auth.resultId) {
                      const popupWidth = 600;
                      const popupHeight = 700;
                      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
                      const top = window.screenY + (window.outerHeight - popupHeight) / 2;
                      const popupFeatures = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes`;

                      window.open(auth.connectUrl, 'authPopup', popupFeatures);
                      setIsPolling(true);
                      setPollError(null);
                      try {
                        const token = await pollForAuthToken(auth.resultId);
                        setIsPolling(false);
                        if (token) {
                          // Optionally, trigger a refresh or update UI
                          window.location.reload();
                        } else {
                          setPollError('Login timed out. Please try again.');
                        }
                      } catch (err) {
                        setIsPolling(false);
                        setPollError('An error occurred during login.');
                      }
                    } else {
                      console.log('Authentication flow could not be initiated from sidebar.');
                    }
                    onClose();
                  }}
                  className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex w-full items-center rounded-md px-4 py-3 text-left text-sm font-medium"
                  disabled={isPolling}
                >
                  <UserIcon
                    className="text-accent-01 mr-3 h-5 w-5"
                    isUserAuthenticated={false}
                    isVerifying={isPolling}
                  />
                  <span>{isPolling ? 'Waiting for Login...' : 'Login'}</span>
                </button>
              )}
            </li>
            <li>
              <Link
                to="/about"
                onClick={() => onClose()}
                className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
              >
                <InfoIcon className="text-accent-01 mr-3 h-5 w-5" />
                <span>About</span>
              </Link>
            </li>
          </ul>
        </nav>

        {pollError && (
          <div className="text-xs text-red-500 px-4 py-2">{pollError}</div>
        )}

        {/* Login Status Indicator */}
        <div className="mt-auto border-t border-light-decorative-01 p-4 dark:border-dark-decorative-00">
          {isLoading ? (
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-gray-400" />
              Loading status...
            </div>
          ) : isAuthenticated && userPayload ? (
            <div className="flex flex-col text-sm">
              <div className="mb-1 flex items-center text-green-600 dark:text-green-400">
                <span className="mr-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                Logged In
              </div>
              <span className="truncate text-xs text-gray-500 dark:text-gray-400" title={userPayload.email}>
                {userPayload.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <span className="mr-2 h-2 w-2 rounded-full bg-red-500" />
              Logged Out
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export a memoized version of the component to prevent unnecessary re-renders
export default memo(SessionSidebar, (prevProps, nextProps) => {
  // Only re-render if isVisible changes
  // Note: Functions should be memoized by parent components
  return prevProps.isVisible === nextProps.isVisible && prevProps.onClose === nextProps.onClose;
});
