import React, { useCallback, useEffect, useRef, useState } from 'react';

type AppSettingsViewProps = {
  title: string;
  onUpdateTitle: (next: string, isManual?: boolean) => Promise<void> | void;
  onDownloadHtml: () => void;
};

const AppSettingsView: React.FC<AppSettingsViewProps> = ({
  title,
  onUpdateTitle,
  onDownloadHtml,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(title);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(title);
  }, [title]);

  const handleEditNameStart = useCallback(() => {
    setIsEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  }, []);

  const handleNameSave = useCallback(async () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== title) {
      await onUpdateTitle(trimmedName, true); // Mark as manually set
    }
    setIsEditingName(false);
  }, [editedName, title, onUpdateTitle]);

  const handleNameCancel = useCallback(() => {
    setEditedName(title);
    setIsEditingName(false);
  }, [title]);

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

  return (
    <div className="flex h-full justify-center p-8 pt-16">
      <div className="w-full max-w-2xl">
        <h2 className="text-light-primary dark:text-dark-primary mb-6 text-center text-2xl font-semibold">
          App Settings
        </h2>

        <div className="space-y-6">
          <div className="bg-light-background-01 dark:bg-dark-background-01 border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6">
            <h3 className="text-light-primary dark:text-dark-primary mb-4 text-lg font-medium">
              General Settings
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-light-primary dark:text-dark-primary opacity-60">You are in <strong>dev mode</strong>. Data is temporary until you publish your app with the share button at top right. You can set the name of your app here or continue to autogenerate names.</p>
                <label className="text-light-primary dark:text-dark-primary block text-sm font-semibold pt-2">
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
                      className="dark:bg-dark-background-00 text-light-primary dark:text-dark-primary flex-1 rounded border-2 border-blue-500 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-blue-400 dark:focus:border-blue-300 dark:focus:ring-blue-400/30"
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
                    <div className="dark:bg-dark-background-01 dark:border-dark-decorative-01 text-light-primary dark:text-dark-primary flex-1 cursor-default rounded border border-gray-200 bg-gray-50 px-3 py-2 font-medium">
                      {title}
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
                  {title !== 'Untitled App'
                    ? `${title.toLowerCase().replace(/\s+/g, '-')}.vibesdiy.app`
                    : 'app-name.vibesdiy.app'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-light-background-01 dark:bg-dark-background-01 border-light-decorative-01 dark:border-dark-decorative-01 rounded-lg border p-6">
            <h3 className="text-light-primary dark:text-dark-primary mb-4 text-lg font-medium">
              Export Options
            </h3>
            <div className="space-y-3">
              <div
                className="bg-light-background-00 dark:bg-dark-background-00 border-light-decorative-01 dark:border-dark-decorative-01 hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex cursor-pointer items-center rounded-lg border p-4 transition-colors"
                onClick={onDownloadHtml}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettingsView;
