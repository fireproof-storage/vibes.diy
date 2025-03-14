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
  headerRight,
}: AppLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex h-[4rem] w-full border-b">
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 w-1/3">
          {headerLeft}
        </div>
        <div className="w-2/3">{headerRight}</div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex h-full w-1/3 flex-col">{chatPanel}</div>
        <div className="relative w-2/3">{previewPanel}</div>
      </div>
    </div>
  );
}
