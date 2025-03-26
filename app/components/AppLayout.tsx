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
    <div className="relative flex h-dvh flex-col md:flex-row md:overflow-hidden">
      {/* Background component that covers the entire viewport */}
      <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
        <LightUpYourData />
      </div>

      {/* Content with relative positioning to appear above the background */}
      <div
        className={`flex w-full flex-col md:w-1/3 ${
          mobilePreviewShown ? 'hidden md:flex md:h-full' : 'h-full'
        } relative z-10`}
      >
        <div className="flex h-[4rem] items-center p-2">{headerLeft}</div>

        <div className="flex-grow overflow-auto">{chatPanel}</div>

        {suggestionsComponent && <div className="w-full">{suggestionsComponent}</div>}

        <div className="w-full">{chatInput}</div>
      </div>

      <div
        className={`flex w-full flex-col md:w-2/3 ${
          mobilePreviewShown ? 'h-full' : 'h-auto overflow-visible opacity-100 md:h-full'
        } relative z-10`}
      >
        <div className="flex h-[4rem] items-center p-2">{headerRight}</div>

        <div className="flex-grow overflow-auto">{previewPanel}</div>

        <div className="w-full">{appInfo}</div>
      </div>
    </div>
  );
}
