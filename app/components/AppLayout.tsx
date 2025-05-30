import type { ReactNode } from 'react';
import LightUpYourData from './ResultPreview/LightUpYourData';

interface AppLayoutProps {
  chatPanel: ReactNode;
  previewPanel: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  chatInput?: ReactNode;
  suggestionsComponent?: ReactNode;
  mobilePreviewShown?: boolean;
  appInfo?: ReactNode;
  fullWidthChat?: boolean;
  heroComponent?: ReactNode;
  recentProjectsComponent?: ReactNode;
  isPreChat?: boolean;
}

export default function AppLayout({
  chatPanel,
  previewPanel,
  headerLeft,
  headerRight,
  chatInput,
  suggestionsComponent,
  mobilePreviewShown = false,
  appInfo,
  fullWidthChat = false,
  heroComponent,
  recentProjectsComponent,
  isPreChat = false,
}: AppLayoutProps) {
  return (
    <div className="relative flex h-dvh flex-col md:flex-row md:overflow-hidden">
      {/* Background component that covers the entire viewport */}
      <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
        <LightUpYourData />
      </div>

      {/* Chat column */}
      <div
        className={`flex w-full flex-col ${fullWidthChat ? 'md:w-full' : 'md:w-1/3'} ${
          mobilePreviewShown ? 'hidden md:flex md:h-full' : 'h-full'
        } relative z-10 transition-all duration-300 ease-in-out`}
      >
        <div className="flex h-full flex-col">
          {isPreChat && heroComponent ? (
            <header className="flex-shrink-0 transition-all duration-300">{heroComponent}</header>
          ) : (
            <header className="h-[4rem] flex-shrink-0">{headerLeft}</header>
          )}

          <main className="flex-grow overflow-auto">{chatPanel}</main>

          <footer className="flex-shrink-0">{chatInput}</footer>

          {isPreChat && suggestionsComponent && (
            <div className={`w-full ${fullWidthChat ? 'md:flex md:justify-center' : ''}`}>
              <div className={`${fullWidthChat ? 'md:w-4/5' : 'w-full'}`}>
                {suggestionsComponent}
              </div>
            </div>
          )}

          {isPreChat && recentProjectsComponent && (
            <aside className="flex-shrink-0 transition-all duration-300">
              {recentProjectsComponent}
            </aside>
          )}
        </div>
      </div>

      <div
        className={`flex w-full flex-col ${fullWidthChat ? 'md:w-0' : 'md:w-2/3'} ${
          mobilePreviewShown ? 'h-full' : 'h-auto overflow-visible opacity-100 md:h-full'
        } relative z-10 transition-all duration-300 ease-in-out`}
      >
        <div
          className={`flex items-center overflow-hidden p-2 ${fullWidthChat ? 'h-0' : 'h-[4rem]'} transition-all duration-300 ease-in-out`}
        >
          {headerRight}
        </div>

        <div className="flex-grow overflow-auto">{previewPanel}</div>

        <div className="w-full">{appInfo}</div>
      </div>
    </div>
  );
}
