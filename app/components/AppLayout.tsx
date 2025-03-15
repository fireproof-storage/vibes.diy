import type { ReactNode } from 'react';

interface AppLayoutProps {
  chatPanel: ReactNode;
  previewPanel: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  chatInput?: ReactNode;
  suggestionsComponent?: ReactNode;
}

/**
 * AppLayout - Common layout component for the application
 * Provides consistent structure with panels that adapt based on screen size:
 * - On mobile: Vertical layout with header -> preview -> headerRight -> chat -> suggestions -> fixed chat input
 * - On desktop: Side-by-side layout with 1:3 ratio between chat and preview panels
 * Can optionally render header components above the content panels
 */
export default function AppLayout({
  chatPanel,
  previewPanel,
  headerLeft,
  headerRight,
  chatInput,
  suggestionsComponent,
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

      {/* Desktop layout - simple side-by-side */}
      <div className="hidden md:flex md:flex-1">
        {/* Left panel - chat + suggestions + chat input */}
        <div className="flex h-full w-1/3 flex-col">
          {/* Chat messages */}
          <div className="flex-auto">{chatPanel}</div>
          
          {/* Suggestions on desktop */}
          {suggestionsComponent && <div className="mt-auto">{suggestionsComponent}</div>}
          
          {/* Chat input on desktop */}
          {chatInput}
        </div>
        
        {/* Right panel - preview */}
        <div className="relative w-2/3 h-full">{previewPanel}</div>
      </div>

      {/* Mobile layout - stacked with custom order */}
      <div className="flex flex-1 flex-col overflow-auto md:hidden">
        {/* Preview panel - first on mobile */}
        <div className="order-1 w-full h-full">{previewPanel}</div>

        {/* HeaderRight placed after preview panel on mobile */}
        {headerRight && (
          <div className="border-light-decorative-00 dark:border-dark-decorative-00 order-2 w-full border-t p-2">
            {headerRight}
          </div>
        )}

        {/* Chat panel - comes after header right */}
        <div className="flex w-full flex-col order-3">
          {/* Chat panel content */}
          <div className="flex-auto">{chatPanel}</div>
        </div>

        {/* Mobile-only suggestions below chat */}
        {suggestionsComponent && (
          <div className="order-4 w-full">{suggestionsComponent}</div>
        )}
      </div>

      {/* Mobile chat input container - fixed to bottom */}
      <div className="md:hidden">
        {/* Chat input fixed to bottom on mobile */}
        <div
          className="border-light-decorative-00 dark:border-dark-decorative-00 fixed right-0 bottom-0 left-0 z-10 border-t bg-white dark:bg-gray-900"
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
