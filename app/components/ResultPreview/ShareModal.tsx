import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trackPublishClick } from '../../utils/analytics';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  publishedAppUrl?: string;
}

export function ShareModal({ isOpen, onClose, buttonRef, publishedAppUrl }: ShareModalProps) {
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  useEffect(() => {
    // Reset state when modal opens/closes
    if (isOpen) {
      setShowCopySuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !buttonRef.current) return null;

  // Get the button's position to position the menu relative to it
  const buttonRect = buttonRef.current.getBoundingClientRect();

  const menuStyle = {
    position: 'fixed' as const,
    top: `${buttonRect.bottom + 8}px`, // 8px gap
    right: `${window.innerWidth - buttonRect.right}px`,
  };

  const handleBackdropClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyUrl = () => {
    if (publishedAppUrl) {
      navigator.clipboard.writeText(publishedAppUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
      trackPublishClick({ publishedAppUrl });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] m-0 bg-black/25"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      aria-label="Share menu"
    >
      <div
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
        className="ring-opacity-5 dark:bg-dark-background-01 w-80 rounded bg-white p-4 shadow-lg ring-1 ring-black"
      >
        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="share-menu">
          <p className="mb-4 text-xs text-blue-700 italic dark:text-blue-200">
            Share your app for anyone to view and remix. Selected apps are featured in{' '}
            <a
              href="https://discord.gg/vnpWycj4Ta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              our community
            </a>
            .
          </p>
          {publishedAppUrl ? (
            <div className="bg-light-background-01 text-light-secondary dark:bg-dark-decorative-00 dark:text-dark-secondary rounded px-2 py-2 text-sm">
              <div className="mb-2 text-center font-medium">
                <strong>App URL</strong>
              </div>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={publishedAppUrl}
                  className="bg-light-background-01 dark:bg-dark-decorative-01 flex-1 truncate rounded-sm px-1 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="ml-1 p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Copy URL"
                >
                  {showCopySuccess ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-green-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-label="Copied to clipboard"
                    >
                      <title>Copied to clipboard</title>
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Copy URL</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">
              No URL available. Click the Share button to publish this app.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
