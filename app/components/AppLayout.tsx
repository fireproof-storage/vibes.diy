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
    <div className="flex h-dvh flex-col relative">
      {/* Header - stacked on mobile, side-by-side on desktop */}
      <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex w-full border-b flex-col md:flex-row z-10 h-[5rem] md:h-[3rem]">
        {/* HeaderLeft is always in the header */}
        <div className="border-light-decorative-00 dark:border-dark-decorative-00 flex items-center w-full md:w-1/3 p-2">
          {headerLeft}
        </div>
        
        {/* HeaderRight only in header on desktop */}
        <div className="hidden md:flex items-center w-full md:w-2/3 p-2">
          {headerRight}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-1 flex-col md:flex-row md:overflow-hidden overflow-auto">
        {/* Chat panel layout (mobile: full width, desktop: 1/3 width) */}
        <div className="flex flex-col w-full md:w-1/3 md:h-full">
          {/* Chat panel (flex-auto to take available space) */}
          <div className="flex-auto">
            {chatPanel}
          </div>
          
          {/* Suggestions component on desktop goes inside chat panel */}
          {suggestionsComponent && (
            <div className="hidden md:block mt-auto">
              {suggestionsComponent}
            </div>
          )}
        </div>
        
        {/* Preview panel - rendered once, different layouts for mobile/desktop */}
        <div className="w-full md:h-full md:w-2/3">
          {previewPanel}
        </div>
        
        {/* HeaderRight placed after preview panel only on mobile */}
        {headerRight && (
          <div className="w-full p-2 border-t border-light-decorative-00 dark:border-dark-decorative-00 md:hidden">
            {headerRight}
          </div>
        )}
        
        {/* Mobile-only suggestions below preview */}
        {suggestionsComponent && (
          <div className="w-full md:hidden">
            {suggestionsComponent}
          </div>
        )}
      </div>
      
      {/* Spacer element to prevent content from being hidden under the chat input - reduced height */}
      <div className="h-[50px] md:hidden"></div>
      
      {/* Chat input fixed to bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-gray-900 border-t border-light-decorative-00 dark:border-dark-decorative-00 p-2 z-10">
        {chatInput}
      </div>
    </div>
  );
}
