import type { ReactNode } from 'react';

interface AppLayoutProps {
  chatPanel: ReactNode;
  previewPanel: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  chatInput?: ReactNode;
  suggestionsComponent?: ReactNode;
  mobilePreviewShown?: boolean;
}

/**
 * AppLayout - Common layout component for the application
 * Provides consistent structure with panels that adapt based on screen size:
 * - On mobile: Vertical layout with header -> preview -> headerRight -> chat -> suggestions -> fixed chat input
 * - On desktop: Side-by-side layout with 1:3 ratio between chat and preview panels
 * Can optionally render header components above the content panels
 * 
 * On mobile devices, preview panel and header right can be hidden by default and shown on demand
 */
export default function AppLayout({
  chatPanel,
  previewPanel,
  headerLeft,
  headerRight,
  chatInput,
  suggestionsComponent,
  mobilePreviewShown = false,
}: AppLayoutProps) {
  return (
    <div className="flex h-dvh flex-col md:overflow-hidden">
      {/* Header - stacked on mobile, side-by-side on desktop */}
      <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex h-[5rem] w-full flex-col border-b md:h-[4rem] md:flex-row">
        {/* HeaderLeft is always in the header */}
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex w-full items-center p-2 md:w-1/3">
          {headerLeft}
        </div>

        {/* HeaderRight - in header on desktop, below preview on mobile */}
        <div className="hidden w-2/3 md:flex">{headerRight}</div>
      </div>

      {/* Main content container - takes up remaining height */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Left panel - chat + suggestions + chat input (on desktop) */}
        <div className="flex flex-col order-3 w-full h-full md:order-none md:w-1/3">
          {/* Chat messages */}
          <div className="flex-auto overflow-auto">{chatPanel}</div>
          
          {/* Suggestions - visible on both desktop and mobile */}
          {suggestionsComponent && (
            <div className="mt-auto order-4 w-full md:order-none">{suggestionsComponent}</div>
          )}
          
          {/* Chat input on desktop */}
          <div className="hidden md:block">{chatInput}</div>
        </div>

        {/* Right panel - preview (single instance, conditionally styled) */}
        <div className={`order-1 w-full h-full md:w-2/3 flex-shrink-0 md:order-none md:block ${mobilePreviewShown ? 'block' : 'hidden'}`}>
          {previewPanel}
        </div>
      </div>

      {/* HeaderRight placed after preview panel on mobile */}
      {headerRight && (
        <div className={`border-light-decorative-00 dark:border-dark-decorative-00 order-2 w-full border-t p-2 md:block ${mobilePreviewShown ? 'block' : 'hidden'}`}>
          {headerRight}
        </div>
      )}
      {/* Mobile chat input container - fixed to bottom */}
      <div className="md:hidden">
        {/* Chat input fixed to bottom on mobile */}
        <div
          className="border-light-decorative-00 dark:border-dark-decorative-00 fixed right-0 bottom-0 left-0 z-30 border-t bg-white dark:bg-gray-900"
          style={{ '--input-height': 'var(--self-height)' } as React.CSSProperties}
          ref={(el) => {
            if (el) {
              const height = el.offsetHeight;
              el.style.setProperty('--self-height', `${height}px`);
            }
          }}
        >
          {chatInput}
        </div>

        {/* This spacer prevents content from being hidden under the fixed chat input */}
        <div className="block h-[var(--input-height,70px)] min-h-[70px]"></div>
      </div>
    </div>
  );
}
