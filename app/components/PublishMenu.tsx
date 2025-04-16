import { useState } from 'react';
import { createPortal } from 'react-dom';

interface PublishMenuProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  publishedAppUrl?: string;
  onPublish: () => Promise<void>;
}

export function PublishMenu({
  isOpen,
  onPublish,
  onClose,
  buttonRef,
  publishedAppUrl,
}: PublishMenuProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);

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

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish();
      if (publishedAppUrl) {
        setShowUpdateSuccess(true);
        setTimeout(() => setShowUpdateSuccess(false), 2000);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = () => {
    if (publishedAppUrl) {
      navigator.clipboard.writeText(publishedAppUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    }
  };

  return createPortal(
    <dialog
      open
      className="fixed inset-0 z-[9999] m-0 bg-transparent p-0"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      aria-label="Publish menu"
    >
      <div
        style={menuStyle}
        className="ring-opacity-5 dark:bg-dark-background-01 w-80 rounded bg-white p-4 shadow-lg ring-1 ring-black"
      >
        <div
          className="py-1"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="publish-menu"
        >
          <p className="mb-4 text-xs text-blue-700 italic dark:text-blue-200">
            <strong>Technical Preview:</strong> Data is browser-local, AI in published apps and
            multi-user sync coming soon.
          </p>
          {publishedAppUrl ? (
            <div className="bg-light-background-01 text-light-secondary dark:bg-dark-decorative-00 dark:text-dark-secondary rounded px-2 py-2 text-sm">
              <div className="mb-2 text-center font-medium">
                <strong>Published</strong>
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
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Copy URL"
                >
                  {showCopySuccess ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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
                      aria-label="Copy to clipboard"
                    >
                      <title>Copy to clipboard</title>
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

              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing || showUpdateSuccess}
                className="hover:text-light-secondary dark:hover:text-dark-secondary text-accent-01 dark:text-accent-01 mt-2 flex w-full items-center justify-center px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  {showUpdateSuccess ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-green-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <title>Update successful</title>
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-green-500">Updated!</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <title>Update App</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span className="text-xs">Update Code</span>
                      {isPublishing && (
                        <svg
                          className="text-accent-01 h-3.5 w-3.5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-label="Publishing in progress"
                        >
                          <title>Updating in progress</title>
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
                      )}
                    </>
                  )}
                </div>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="accent-00 text-light-secondary hover:bg-light-background-01 dark:bg-dark-decorative-01 dark:text-dark-secondary dark:hover:bg-dark-decorative-00 block w-full rounded px-4 py-2 text-center text-sm disabled:cursor-not-allowed disabled:opacity-50"
              role="menuitem"
            >
              <div className="flex items-center justify-between">
                <span className="w-full text-center font-bold">Publish App</span>
                {isPublishing && (
                  <svg
                    className="text-accent-01 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-label="Publishing in progress"
                  >
                    <title>Publishing in progress</title>
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
                )}
              </div>
            </button>
          )}
        </div>
      </div>
    </dialog>,
    document.body
  );
}
