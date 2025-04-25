import { useEffect, useRef, useState, memo } from 'react';
import { GearIcon } from './SessionSidebar/GearIcon';
import { InfoIcon } from './SessionSidebar/InfoIcon';
import { StarIcon } from './SessionSidebar/StarIcon';
import { HomeIcon } from './SessionSidebar/HomeIcon';
import { UserIcon } from './HeaderContent/SvgIcons';
import type { SessionSidebarProps } from '../types/chat';
import VibesDIYLogo from './VibesDIYLogo';
import { useAuth } from '../hooks/useAuth';
import { initiateAuthFlow } from '../utils/auth';
import { trackAuthClick } from '../utils/analytics';

/**
 * Component that displays a navigation sidebar with menu items
 */
function SessionSidebar({ isVisible, onClose }: SessionSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const [needsLogin, setNeedsLogin] = useState(false);

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
              <a
                href="/"
                onClick={() => onClose()}
                className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
              >
                <HomeIcon className="text-accent-01 mr-3 h-5 w-5" />
                <span>Home</span>
              </a>
            </li>
            <li>
              <a
                href="/vibes/mine"
                onClick={() => onClose()}
                className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
              >
                <StarIcon className="text-accent-01 mr-3 h-5 w-5" />
                <span>My Vibes</span>
              </a>
            </li>
            <li>
              {isAuthenticated ? (
                <a
                  href="/settings"
                  onClick={() => onClose()}
                  className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
                >
                  <GearIcon className="text-accent-01 mr-3 h-5 w-5" />
                  <span>Settings</span>
                </a>
              ) : needsLogin ? (
                <button
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
                  onClick={() => {
                    trackAuthClick();
                    initiateAuthFlow();
                    onClose();
                  }}
                  className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex w-full items-center rounded-md px-4 py-3 text-left text-sm font-medium"
                >
                  <UserIcon
                    className="text-accent-01 mr-3 h-5 w-5"
                    isUserAuthenticated={false}
                    isVerifying={false}
                  />
                  <span>Login</span>
                </button>
              )}
            </li>
            <li>
              <a
                href="/about"
                onClick={() => onClose()}
                className="hover:bg-light-background-01 dark:hover:bg-dark-background-01 flex items-center rounded-md px-4 py-3 text-sm font-medium"
              >
                <InfoIcon className="text-accent-01 mr-3 h-5 w-5" />
                <span>About</span>
              </a>
            </li>
          </ul>
        </nav>
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
