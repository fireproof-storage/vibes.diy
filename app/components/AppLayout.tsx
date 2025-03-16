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
      <div
        className={`flex w-full flex-col md:w-1/3 ${
          mobilePreviewShown ? 'hidden md:flex md:h-full' : 'h-full'
        }`}
      >
        <div className="flex h-[4rem] items-center p-2">{headerLeft}</div>

        <div className="flex-grow overflow-auto">{chatPanel}</div>
          
        {suggestionsComponent && <div className="w-full">{suggestionsComponent}</div>}

        <div className="w-full">{chatInput}</div>
      </div>

      <div
        className={`flex w-full flex-col md:w-2/3 ${
          mobilePreviewShown ? 'h-full' : 'h-0 opacity-0 overflow-hidden md:h-full md:opacity-100 md:overflow-visible'
        }`}
      >
        <div className="flex h-[4rem] items-center p-2">{headerRight}</div>

        <div className="flex-grow overflow-auto">{previewPanel}</div>

        <div className="w-full">{appInfo}</div>
      </div>
    </div>
  );
}
