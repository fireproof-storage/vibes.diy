import type { ReactNode } from 'react';

interface AppLayoutProps {
  chatPanel: ReactNode;
  previewPanel: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  chatInput?: ReactNode;
  suggestionsComponent?: ReactNode;
  mobilePreviewShown?: boolean;
  appInfo?: ReactNode;
}

/**
 * AppLayout - Common layout component for the application
 * Provides consistent structure with panels that adapt based on screen size:
 * - On mobile: Two-panel layout that toggles between:
 *   1. messages panel (header left, messages, input)
 *   2. code/preview panel (header right, code/preview, app info)
 * - On desktop: Side-by-side layout with messages panel and code/preview panel
 *
 * Panels are laid out according to wireframe:
 * - Left panel: header left, messages area, input
 * - Right panel: header right, code/preview area, app info
 */
export default function AppLayout({
  chatPanel,
  previewPanel,
  headerLeft,
  headerRight,
  chatInput,
  suggestionsComponent,
  mobilePreviewShown = false,
  appInfo,
}: AppLayoutProps) {
  return (
    <div className="flex h-dvh flex-col md:flex-row md:overflow-hidden">
      {/* Messages Panel - Always visible on desktop, conditionally visible on mobile */}
      <div
        className={`flex h-full w-full flex-col md:w-1/3 ${mobilePreviewShown ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Header Left Section */}
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex h-[4rem] items-center border-b p-2">
          {headerLeft}
        </div>

        {/* Chat Messages Section - scrollable */}
        <div className="flex-1 overflow-auto">{chatPanel}</div>

        {/* Suggestions Component - if provided */}
        {suggestionsComponent && <div className="w-full">{suggestionsComponent}</div>}

        {/* Chat Input Section */}
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 border-t">
          {chatInput}
        </div>
      </div>

      {/* Code/Preview Panel - Always visible on desktop, conditionally visible on mobile */}
      <div
        className={`flex h-full w-full flex-col md:w-2/3 ${mobilePreviewShown ? 'flex' : 'invisible md:flex'}`}
      >
        {/* Header Right Section */}
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex h-[4rem] items-center border-b p-2">
          {headerRight}
        </div>

        {/* Preview Content Section - scrollable */}
        <div className="flex-1 overflow-auto">{previewPanel}</div>

        {/* App Info Section */}
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 border-t">
          {appInfo}
        </div>
      </div>
    </div>
  );
}
