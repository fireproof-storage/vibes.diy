import type { ReactNode } from 'react';

interface AppLayoutProps {
  chatPanel: ReactNode;
  previewPanel: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
}

/**
 * AppLayout - Common layout component for the application
 * Provides consistent structure with 1:3 ratio between chat panel and preview panel
 * Can optionally render header components above the content panels
 */
export default function AppLayout({ 
  chatPanel, 
  previewPanel, 
  headerLeft, 
  headerRight 
}: AppLayoutProps) {
  const hasHeader = Boolean(headerLeft || headerRight);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {hasHeader && (
        <div className="flex h-[4rem] w-full border-b border-light-decorative-00 dark:border-dark-decorative-00">
          <div className="w-1/3 border-r border-light-decorative-00 dark:border-dark-decorative-00">
            {headerLeft}
          </div>
          <div className="w-2/3">
            {headerRight}
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex h-full w-1/3 flex-col">{chatPanel}</div>
        <div className="relative w-2/3">{previewPanel}</div>
      </div>
    </div>
  );
}
