import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RuntimeError } from '../../hooks/useRuntimeErrors';
import { useSession } from '../../hooks/useSession';
import { normalizeComponentExports } from '../../utils/normalizeComponentExports';
import { animationStyles } from './ResultPreviewTemplates';
import type { IframeFiles, ResultPreviewProps } from './ResultPreviewTypes';
// import { encodeTitle } from '../SessionSidebar/utils';
// ResultPreview component
import { CALLAI_ENDPOINT } from '../../config/env';
import IframeContent from './IframeContent';
import iframeTemplateRaw from './templates/iframe-template.html?raw';
import { transformImports } from './transformImports';

function ResultPreview({
  code,
  dependencies,
  onScreenshotCaptured,
  sessionId,
  title,
  isStreaming = false,
  codeReady = false,
  displayView,
  onPreviewLoaded,
  setMobilePreviewShown,
  setIsIframeFetching,
  addError,
  children,
  onCodeSave,
  onCodeChange,
  onSyntaxErrorChange,
}: ResultPreviewProps & { children?: React.ReactNode }) {
  // Use CSS-based dark mode detection like the rest of the UI
  const isDarkMode =
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true; // Default to dark mode for SSR
  const { updateTitle, session } = useSession(sessionId);
  const showWelcome = !isStreaming && (!code || code.length === 0);

  // Use session title if available, otherwise fall back to prop
  const currentTitle = session?.title || title || 'Untitled App';

  // State for editing app name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentTitle);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Update edited name when title changes
  useEffect(() => {
    setEditedName(currentTitle);
  }, [currentTitle]);

  // Handle name edit start
  const handleEditNameStart = useCallback(() => {
    setIsEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  }, []);

  // Handle name save
  const handleNameSave = useCallback(async () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== currentTitle) {
      await updateTitle(trimmedName);
    }
    setIsEditingName(false);

    // navigate(`/chat/${sessionId}/${trimmedName}/settings`);
  }, [editedName, currentTitle, updateTitle]);

  // Handle name cancel
  const handleNameCancel = useCallback(() => {
    setEditedName(currentTitle);
    setIsEditingName(false);
  }, [currentTitle]);

  // Handle key press in name input
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleNameSave();
      } else if (e.key === 'Escape') {
        handleNameCancel();
      }
    },
    [handleNameSave, handleNameCancel]
  );

  // Calculate filesContent directly based on code prop
  const filesContent = useMemo<IframeFiles>(() => {
    // Always return the expected structure, defaulting code to empty string
    return {
      '/App.jsx': {
        code: code && !showWelcome ? code : '', // Use code if available, else empty string
        active: true,
      },
    };
  }, [code, showWelcome, codeReady, isStreaming]); // Include codeReady to ensure updates

  // Theme is now provided by ThemeContext

  // Function to download HTML file
  const handleDownloadHtml = useCallback(async () => {
    try {
      // Normalize and transform the code
      const normalizedCode = normalizeComponentExports(code);
      const transformedCode = transformImports(normalizedCode);

      // Create session ID
      const sessionIdValue = sessionId || 'default-session';

      // Generate HTML content using the same template as iframe
      const htmlContent = iframeTemplateRaw
        .replaceAll('{{API_KEY}}', 'sk-vibes-proxy-managed')
        .replaceAll('{{CALLAI_ENDPOINT}}', CALLAI_ENDPOINT)
        .replace('{{APP_CODE}}', transformedCode)
        .replace('{{SESSION_ID}}', sessionIdValue);

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTitle !== 'Untitled App' ? currentTitle : 'app'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download HTML:', error);
      if (addError) {
        addError({
          type: 'error',
          message: 'Failed to download HTML file',
          source: 'download-html',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [code, sessionId, currentTitle, addError]);

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data) {
        if (data.type === 'preview-ready' || data.type === 'preview-loaded') {
          // No API key needed - proxy handles authentication
          setMobilePreviewShown(true);
          onPreviewLoaded();
        } else if (data.type === 'streaming' && data.state !== undefined) {
          if (setIsIframeFetching) {
            setIsIframeFetching(data.state);
          }
        } else if (data.type === 'screenshot' && data.data) {
          if (onScreenshotCaptured) {
            onScreenshotCaptured(data.data);
          }
        } else if (data.type === 'screenshot-error' && data.error) {
          // Still call onScreenshotCaptured with null to signal that the screenshot failed
          if (onScreenshotCaptured) {
            onScreenshotCaptured(null);
          }
        } else if (data.type === 'iframe-error' && data.error) {
          const error = data.error as RuntimeError;
          if (addError) {
            addError(error);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [
    onScreenshotCaptured,
    onPreviewLoaded,
    setIsIframeFetching,
    setMobilePreviewShown,
    addError,
    sessionId,
    currentTitle,
  ]);

  const previewArea = showWelcome ? (
    <div className="h-full">{/* empty div to prevent layout shift */}</div>
  ) : displayView === 'settings' ? (
    <div className="flex h-full justify-center p-8 pt-16">
      <div className="w-full max-w-2xl">
        <h2 className="text-light-primary dark:text-dark-primary mb-6 text-center text-2xl font-semibold">
          App Settings
        </h2>

        <div className="space-y-6">
          {/* General Settings Section */}
          <div className="bg-light-background-01 dark:bg-dark-background-01 border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6">
            <h3 className="text-light-primary dark:text-dark-primary mb-4 text-lg font-medium">
              General Settings
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-light-primary dark:text-dark-primary block text-sm font-semibold">
                  App Name
                </label>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      onBlur={handleNameSave}
                      className="bg-light-background-00 dark:bg-dark-background-00 border-light-decorative-01 dark:border-dark-decorative-01 text-light-primary dark:text-dark-primary focus:ring-light-primary/20 dark:focus:ring-dark-primary/20 flex-1 rounded border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                      placeholder="Enter app name"
                    />
                    <button
                      onClick={handleNameSave}
                      className="hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded p-1 text-green-600 dark:text-green-400"
                      title="Save"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={handleNameCancel}
                      className="hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded p-1 text-red-600 dark:text-red-400"
                      title="Cancel"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="bg-light-background-00 dark:bg-dark-background-00 border-light-decorative-01 dark:border-dark-decorative-01 text-light-primary dark:text-dark-primary flex-1 rounded border px-3 py-2">
                      {currentTitle}
                    </div>
                    <button
                      onClick={handleEditNameStart}
                      className="bg-light-background-01 dark:bg-dark-decorative-01 text-light-secondary dark:text-dark-secondary hover:bg-light-background-02 dark:hover:bg-dark-decorative-00 focus:ring-light-border-01 dark:focus:ring-dark-border-01 rounded-md px-4 py-2 text-sm font-semibold shadow transition-colors focus:ring-1 focus:outline-none"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="opacity-60">
                <div className="text-light-primary dark:text-dark-primary mb-1 flex items-center gap-2 font-medium">
                  Custom Domain
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-xs font-medium text-white">
                    ✨ Pro
                  </span>
                  <span className="inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
                    🚀 Soon
                  </span>
                </div>
                <div className="text-light-primary/70 dark:text-dark-primary/70 text-sm">
                  {currentTitle !== 'Untitled App'
                    ? `${currentTitle.toLowerCase().replace(/\s+/g, '-')}.vibesdiy.app`
                    : 'app-name.vibesdiy.app'}
                </div>
              </div>
            </div>
          </div>

          {/* Export Settings Section */}
          <div className="bg-light-background-01 dark:bg-dark-background-01 border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6">
            <h3 className="text-light-primary dark:text-dark-primary mb-4 text-lg font-medium">
              Export Options
            </h3>
            <div className="space-y-3">
              <div
                className="bg-light-background-00 dark:bg-dark-background-00 border-light-decorative-01 dark:border-dark-decorative-01 hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex cursor-pointer items-center rounded-lg border p-4 transition-colors"
                onClick={handleDownloadHtml}
              >
                <div className="flex-1">
                  <div className="text-light-primary dark:text-dark-primary font-medium">
                    Download html
                  </div>
                  <div className="text-light-primary/70 dark:text-dark-primary/70 text-sm">
                    Just open it in your browser.
                  </div>
                </div>
              </div>
              {/*
              <div className="flex items-center p-4 bg-light-background-00 dark:bg-dark-background-00 rounded-lg border border-light-decorative-01 dark:border-dark-decorative-01 transition-colors cursor-not-allowed opacity-50">
                <div className="flex-1">
                  <div className="font-medium text-light-primary dark:text-dark-primary">Download vite-template</div>
                  <div className="text-sm text-light-primary/70 dark:text-dark-primary/70">Export as Vite project</div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-light-background-00 dark:bg-dark-background-00 rounded-lg border border-light-decorative-01 dark:border-dark-decorative-01 transition-colors cursor-not-allowed opacity-50">
                <div className="flex-1">
                  <div className="font-medium text-light-primary dark:text-dark-primary">Connect Github</div>
                  <div className="text-sm text-light-primary/70 dark:text-dark-primary/70">Deploy to GitHub</div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-light-background-00 dark:bg-dark-background-00 rounded-lg border border-light-decorative-01 dark:border-dark-decorative-01 transition-colors cursor-not-allowed opacity-50">
                <div className="flex-1">
                  <div className="font-medium text-light-primary dark:text-dark-primary">Connect V0</div>
                  <div className="text-sm text-light-primary/70 dark:text-dark-primary/70">Deploy to V0</div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-light-background-00 dark:bg-dark-background-00 rounded-lg border border-light-decorative-01 dark:border-dark-decorative-01 transition-colors cursor-not-allowed opacity-50">
                <div className="flex-1">
                  <div className="font-medium text-light-primary dark:text-dark-primary">Connect Netlify</div>
                  <div className="text-sm text-light-primary/70 dark:text-dark-primary/70">Deploy to Netlify</div>
                </div>
              </div>
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <IframeContent
      activeView={displayView}
      filesContent={filesContent}
      isStreaming={!codeReady}
      codeReady={codeReady}
      isDarkMode={isDarkMode}
      sessionId={sessionId}
      onCodeSave={onCodeSave}
      onCodeChange={onCodeChange}
      onSyntaxErrorChange={onSyntaxErrorChange}
    />
  );

  return (
    <div className="h-full" style={{ overflow: 'hidden' }}>
      <style>{animationStyles}</style>
      {previewArea}
      {children}
    </div>
  );
}

export default ResultPreview;
