import React, { useState } from 'react';
import { copyToClipboard, encodeStateToUrl } from '../../utils/sharing';

interface ResultPreviewToolbarProps {
  previewReady: boolean;
  activeView: 'preview' | 'code';
  setActiveView: (view: 'preview' | 'code') => void;
  bundlingComplete: boolean;
  isStreaming: boolean;
  code: string;
  dependencies?: Record<string, string>;
}

const ResultPreviewToolbar: React.FC<ResultPreviewToolbarProps> = ({
  previewReady,
  activeView,
  setActiveView,
  bundlingComplete,
  isStreaming,
  code,
  dependencies = {},
}) => {
  const [shareStatus, setShareStatus] = useState<string>('');

  function handleShare() {
    if (!code) {
      alert('Generate an app first before sharing!');
      return;
    }

    const encoded = encodeStateToUrl(code, dependencies);
    if (encoded) {
      copyToClipboard(`${window.location.origin}/shared?state=${encoded}`);
      setShareStatus('Share URL copied to clipboard!');
      setTimeout(() => {
        setShareStatus('');
      }, 3000);
    }
  }

  const showSwitcher = code.length > 0;

  return (
    <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 flex h-[4rem] items-center justify-between border-b px-6 py-4">
      {showSwitcher ? (
        <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex space-x-1 rounded-lg p-1 shadow-sm">
          <button
            type="button"
            disabled={!previewReady}
            onClick={() => setActiveView('preview')}
            className={`flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeView === 'preview'
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
              className={`h-4 w-4 ${bundlingComplete && !previewReady ? 'animate-spin-slow' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Preview icon</title>
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
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('code');
            }}
            className={`flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeView === 'code'
                ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
            }`}
            aria-label="Switch to code editor"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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
            <span>Code</span>
          </button>
        </div>
      ) : (
        <div className="h-10"></div>
      )}
      {code ? (
        <div className="flex items-center gap-2">
          {shareStatus && (
            <span className="text-sm text-green-600 dark:text-green-400">{shareStatus}</span>
          )}
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex space-x-1 rounded-lg p-1 shadow-sm">
            <button
              type="button"
              onClick={handleShare}
              className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
              aria-label="Share app"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Share icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span>Share</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="h-10 w-10"></div>
      )}
    </div>
  );
};

export default ResultPreviewToolbar;
