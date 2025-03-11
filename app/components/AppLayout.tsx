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
      <div className="w-1/3 flex flex-col h-full">
        {chatPanel}
      </div>
      <div className="w-2/3 relative">
        {previewPanel}
      </div>
    </div>
  );
} 