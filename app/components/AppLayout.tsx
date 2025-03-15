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
 * - On mobile: Vertical layout with chat -> preview -> suggestions -> fixed chat input
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
    <div className="relative flex h-dvh flex-col">
      {/* Header - stacked on mobile, side-by-side on desktop */}
      <div className="border-light-decorative-00 dark:border-dark-decorative-00 z-10 flex h-[5rem] w-full flex-col border-b md:h-[3rem] md:flex-row">
        {/* HeaderLeft is always in the header */}
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex w-full items-center p-2 md:w-1/3">
          {headerLeft}
        </div>

        {/* HeaderRight only in header on desktop */}
        <div className="hidden w-full items-center p-2 md:flex md:w-2/3">{headerRight}</div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-auto md:flex-row md:overflow-hidden">
        {/* Chat panel layout (mobile: full width, desktop: 1/3 width) */}
        <div className="flex w-full flex-col md:h-full md:w-1/3">
          {/* Chat panel (flex-auto to take available space) */}
          <div className="flex-auto">{chatPanel}</div>

          {/* Suggestions component on desktop goes inside chat panel */}
          {suggestionsComponent && (
            <div className="mt-auto hidden md:block">{suggestionsComponent}</div>
          )}
        </div>

        {/* Preview panel - rendered once, different layouts for mobile/desktop */}
        <div className="w-full md:h-full md:w-2/3">{previewPanel}</div>

        {/* HeaderRight placed after preview panel only on mobile */}
        {headerRight && (
          <div className="border-light-decorative-00 dark:border-dark-decorative-00 w-full border-t p-2 md:hidden">
            {headerRight}
          </div>
        )}

        {/* Mobile-only suggestions below preview */}
        {suggestionsComponent && <div className="w-full md:hidden">{suggestionsComponent}</div>}
      </div>

      {/* Mobile chat input container */}
      <div className="md:hidden">
        {/* Chat input fixed to bottom on mobile */}
        <div
          className="border-light-decorative-00 dark:border-dark-decorative-00 fixed right-0 bottom-0 left-0 z-10 border-t bg-white md:hidden dark:bg-gray-900"
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
        <div className="block h-[var(--input-height,70px)] min-h-[70px] md:hidden"></div>
      </div>
    </div>
  );
}
