import type { ReactNode } from 'react';

interface AppLayoutProps {
  chatPanel: ReactNode;
  previewPanel: ReactNode;
}

/**
 * AppLayout - Common layout component for the application
 * Provides consistent structure with 1:3 ratio between chat panel and preview panel
 */
export default function AppLayout({ chatPanel, previewPanel }: AppLayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="flex h-full w-1/3 flex-col">{chatPanel}</div>
      <div className="relative w-2/3">{previewPanel}</div>
    </div>
  );
}
