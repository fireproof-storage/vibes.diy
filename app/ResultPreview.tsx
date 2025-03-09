import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { sandpackDependencies } from './utils/versions';

interface ResultPreviewProps {
  code: string;
  streamingCode?: string;
  isStreaming?: boolean;
  dependencies?: Record<string, string>;
  onShare?: () => void;
  shareStatus?: string;
  completedMessage?: string;
  currentMessage?: { content: string };
  currentStreamContent?: string;
  restartCount?: number; // P005e
}

const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              'light-primary': '#2C2C2C',
              'light-secondary': '#2C2C2C',
              'light-decorative-00': '#EBEAEA',
              'light-decorative-01': '#E0DEDE',
              'light-decorative-02': '#2C2C2C',
              'light-background-00': '#FFFFFF',
              'light-background-01': '#F5F5F5',
              'light-background-02': '#F0F0F0',
              'dark-primary': '#FFFFFF',
              'dark-secondary': '#FFFFFF',
              'dark-decorative-00': '#302F30',
              'dark-decorative-01': '#414141',
              'dark-decorative-02': '#FFFFFF',
              'dark-background-00': '#171616',
              'dark-background-01': '#201F20',
              'dark-background-02': '#201F20',
              'accent-00-light': '#F9A100',
              'accent-01-light': '#F58709',
              'accent-02-light': '#F16C12',
              'accent-03-light': '#EE521C',
              'accent-00-dark': '#FFAA0F',
              'accent-01-dark': '#FF8F0F',
              'accent-02-dark': '#FF7119',
              'accent-03-dark': '#FF612A',
            }
          }
        }
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>`;

// Welcome component to show instead of sandbox on initial load
function WelcomeScreen() {
  return (
    <div className="bg-light-background-01 dark:bg-dark-background-01 flex h-full flex-col items-center justify-center">
      <img
        src="/lightup.png"
        alt="Lightup"
        className="pulsing h-auto w-full max-w-xs"
        style={{
          width: '100%',
          height: 'auto',
          transform: 'rotate(-5deg)',
          animation: 'pulse 8s infinite',
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse {
            0% {
              transform: rotate(-5deg) scale(1);
            }
            50% {
              transform: rotate(0deg) scale(1.05);
            }
            100% {
              transform: rotate(-5deg) scale(1);
            }
          }
          img.pulsing {
            animation: pulse 8s infinite;
          }
        `,
        }}
      />
    </div>
  );
}

const defaultCode = '';

// Component to listen for Sandpack events
function SandpackEventListener({
  setActiveView,
  setBundlingComplete,
  isStreaming,
}: {
  setActiveView: (view: 'preview' | 'code') => void;
  setBundlingComplete: (complete: boolean) => void;
  isStreaming: boolean;
}) {
  const { listen } = useSandpack();

  useEffect(() => {
    // Set bundling as not complete when the component mounts
    setBundlingComplete(false);

    const unsubscribe = listen((message) => {
      if (message.type === 'start') {
        setBundlingComplete(false);
      } else if (message.type === 'urlchange') {
        // Mark bundling as complete
        setBundlingComplete(true);

        // Only switch to preview if we're not currently streaming
        if (!isStreaming) {
          setActiveView('preview');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [listen, setActiveView, setBundlingComplete, isStreaming]);

  return null;
}

// Helper function to clean code by removing anything before the first import
const cleanCodeBeforeImport = (codeString: string) => {
  return codeString.replace(/^[\s\S]*?(import|export)/, '$1');
};

// A scroll controller that prioritizes staying at the bottom with line highlighting
function SandpackScrollController({ isStreaming }: { isStreaming: boolean }) {
  // Keep track of scroll state to avoid unnecessary scrolling
  const lastScrollHeight = useRef(0);
  const lastScrollPosition = useRef(0);
  const isScrolling = useRef(false);
  const hasUserScrolled = useRef(false); // Track if user has manually scrolled
  const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let primaryScroller: HTMLElement | null = null;

    // Create a persistent style element that won't be removed/replaced
    if (!document.getElementById('highlight-style')) {
      const style = document.createElement('style');
      style.id = 'highlight-style';
      style.textContent = `
        /* Fixed highlighting style that won't be overridden */
        .cm-line-highlighted {
          position: relative !important;
          border-left: 3px solid rgba(0, 137, 249, 0.27) !important;
          color: inherit !important;
        }
        
        .cm-line-highlighted::before {
          content: "" !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: linear-gradient(60deg, rgba(0, 128, 255, 0.15), rgba(224, 255, 255, 0.25), rgba(0, 183, 255, 0.15)) !important;
          background-size: 200% 200% !important;
          animation: sparkleAppear 2s ease-out !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
        
        @keyframes sparkleGradient {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        
        @keyframes sparkleAppear {
          0% { opacity: 0.8; }
          50% { opacity: 0.8; }
          100% { opacity: 0.1; }
        }
      `;
      document.head.appendChild(style);
    }

    // Function to scroll to bottom - using the original effective approach
    const scrollToBottom = () => {
      if (!primaryScroller) return;
      isScrolling.current = true;

      requestAnimationFrame(() => {
        if (primaryScroller) {
          primaryScroller.scrollTop = primaryScroller.scrollHeight;
          lastScrollHeight.current = primaryScroller.scrollHeight;
          lastScrollPosition.current = primaryScroller.scrollTop;
        }
        isScrolling.current = false;
      });
    };

    // Simpler function to just apply the highlight to the last line
    const highlightLastLine = () => {
      if (!primaryScroller || !isStreaming) return;

      // First, remove all existing highlights to start fresh
      document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
        el.classList.remove('cm-line-highlighted');
      });

      // Then find the last non-empty line
      const lines = Array.from(document.querySelectorAll('.cm-line'));
      let lastLine = null;

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const content = line.textContent || '';
        if (content.trim() && !content.includes('END OF CODE')) {
          lastLine = line;
          break;
        }
      }

      // Apply highlight if we found a valid line
      if (lastLine) {
        lastLine.classList.add('cm-line-highlighted');
        // console.log('Highlighted line:', lastLine.textContent);
      }
    };

    // Repeatedly check for the scroller until we find it
    const checkForScroller = setInterval(() => {
      if (primaryScroller) {
        clearInterval(checkForScroller);
        return;
      }

      const newScroller = document.querySelector('.cm-scroller');
      if (newScroller && newScroller instanceof HTMLElement) {
        primaryScroller = newScroller;

        // Initial scroll to bottom as soon as we find the scroller
        scrollToBottom();

        // Create content observer only after finding the scroller
        setupContentObserver();
      }
    }, 100);

    // Setup the content observer after we've found the scroller
    const setupContentObserver = () => {
      if (!primaryScroller) return;

      // Create an observer for content changes
      const contentObserver = new MutationObserver(() => {
        // Check if content has changed
        if (!primaryScroller) return;

        const newHeight = primaryScroller.scrollHeight;

        // Only highlight the last line if streaming is active
        if (isStreaming) {
          highlightLastLine();
        } else {
          // Remove all highlights when not streaming
          document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
            el.classList.remove('cm-line-highlighted');
          });
        }

        // Only proceed with scrolling if height changed
        if (newHeight === lastScrollHeight.current) return;

        // Calculate if user is near the bottom (within 100px)
        const isNearBottom =
          primaryScroller.scrollTop + primaryScroller.clientHeight > lastScrollHeight.current - 100;

        // Always scroll to bottom if we haven't scrolled manually OR we're near the bottom
        if (!hasUserScrolled.current || isNearBottom) {
          scrollToBottom();
        }

        // Update height reference even if we didn't scroll
        lastScrollHeight.current = newHeight;
      });

      // Track user scroll events
      const handleScroll = () => {
        if (isScrolling.current || !primaryScroller) return;

        // Detect if this is a user-initiated scroll
        const currentPosition = primaryScroller.scrollTop;
        if (Math.abs(currentPosition - lastScrollPosition.current) > 10) {
          hasUserScrolled.current = true;
          lastScrollPosition.current = currentPosition;

          // If user scrolls to near bottom, consider it a "reset"
          if (
            primaryScroller.scrollTop + primaryScroller.clientHeight >=
            primaryScroller.scrollHeight - 50
          ) {
            hasUserScrolled.current = false;
          }
        }
      };

      // Start observing for content changes
      if (primaryScroller) {
        contentObserver.observe(primaryScroller, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        // Add scroll listener
        primaryScroller.addEventListener('scroll', handleScroll);

        // Initial highlight if streaming
        if (isStreaming) {
          highlightLastLine();
        }
      }

      // Set up a fallback timer to periodically check for and highlight new lines
      // Only if streaming is active
      if (isStreaming) {
        highlightIntervalRef.current = setInterval(highlightLastLine, 10);
      }

      // Cleanup function
      return () => {
        clearInterval(checkForScroller);
        if (highlightIntervalRef.current) {
          clearInterval(highlightIntervalRef.current);
          highlightIntervalRef.current = null;
        }
        contentObserver.disconnect();
        primaryScroller?.removeEventListener('scroll', handleScroll);
      };
    };

    // Extra precaution: force scroll to bottom when streaming starts
    setTimeout(scrollToBottom, 100);

    // Cleanup all intervals on unmount
    return () => {
      clearInterval(checkForScroller);
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
        highlightIntervalRef.current = null;
      }
      // We'll leave the style element to avoid flickering if component remounts
    };
  }, [isStreaming]);

  // Effect to handle changes in streaming state
  useEffect(() => {
    // If streaming stops, clear the highlight interval
    if (!isStreaming && highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current);
      highlightIntervalRef.current = null;

      // Remove all highlights
      document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
        el.classList.remove('cm-line-highlighted');
      });
    }
  }, [isStreaming]);

  return null;
}

function ResultPreview({
  code,
  streamingCode = '',
  isStreaming = false,
  dependencies = {},
  onShare,
  shareStatus,
  completedMessage,
  currentMessage,
  currentStreamContent,
  restartCount = 0, // P005e
}: ResultPreviewProps) {
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [displayCode, setDisplayCode] = useState(code || defaultCode);
  const [appStartedCount, setAppStartedCount] = useState(0);
  const [bundlingComplete, setBundlingComplete] = useState(true);
  const justFinishedStreamingRef = useRef(false);
  // Add state to control whether to show welcome screen or sandbox
  const [showWelcome, setShowWelcome] = useState(true);
  // Add state to track the current theme
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Add ref for the code editor container
  const codeEditorRef = useRef<HTMLDivElement>(null);
  // Add state to prevent auto-switching to preview during streaming
  const [lockCodeView, setLockCodeView] = useState(false);
  // Add a ref to store the files to prevent unnecessary re-renders
  const filesRef = useRef({
    '/index.html': {
      code: indexHtml,
      hidden: true,
    },
    '/App.jsx': {
      code: code || defaultCode,
      active: true,
    },
  });

  // Detect system theme preference
  useEffect(() => {
    // Check initial preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDarkMode);

    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update displayed code when code changes or streaming ends
  useEffect(() => {
    if (!isStreaming) {
      // Add exactly 20 lines of whitespace and a very visible end marker
      const codeWithWhitespace =
        cleanCodeBeforeImport(code || defaultCode) +
        '\n\n\n\n\n\n\n\n\n\n' +
        '\n\n\n\n\n\n\n\n\n\n' +
        '\n';
      setDisplayCode(codeWithWhitespace);

      // Update the files ref without causing re-render
      filesRef.current = {
        ...filesRef.current,
        '/App.jsx': {
          code: codeWithWhitespace,
          active: true,
        },
      };

      // If we have actual code (not default), hide welcome screen
      if (code) {
        setShowWelcome(false);
      }
    }
  }, [code, isStreaming]);

  // Update displayed code during streaming
  useEffect(() => {
    if (isStreaming) {
      if (streamingCode) {
        // Add exactly 20 lines of whitespace and a very visible end marker
        const codeWithWhitespace = cleanCodeBeforeImport(streamingCode) + '\n\n\n\n\n\n\n\n\n\n';
        setDisplayCode(codeWithWhitespace);

        // Update the files ref without causing re-render
        filesRef.current = {
          ...filesRef.current,
          '/App.jsx': {
            code: codeWithWhitespace,
            active: true,
          },
        };

        // Hide welcome screen when streaming starts
        setShowWelcome(false);
        // Always show code view when streaming
        setActiveView('code');
        // We want to lock the view to code during streaming
        setLockCodeView(true);
      }
    }
  }, [streamingCode, isStreaming]);

  // When streaming stops, unlock the view
  useEffect(() => {
    if (!isStreaming) {
      setLockCodeView(false);
      // The next URL change event will now trigger the switch to preview
      // since we've updated the SandpackEventListener to check isStreaming
    }
  }, [isStreaming]);

  // Track when streaming ends
  useEffect(() => {
    if (isStreaming && streamingCode) {
      justFinishedStreamingRef.current = true;
    }
  }, [isStreaming, streamingCode]);

  // Reset justFinishedStreamingRef when bundling completes
  useEffect(() => {
    if (bundlingComplete) {
      justFinishedStreamingRef.current = false;
    }
  }, [bundlingComplete]);

  // Determine if the preview icon should spin
  const shouldSpin = !isStreaming && justFinishedStreamingRef.current && !bundlingComplete;

  useEffect(() => {
    console.log('dependencies', dependencies);
  }, [dependencies]);

  // CSS for the spinning animation
  const spinningIconClass = shouldSpin ? 'animate-spin-slow' : '';

  // Use a stable key for SandpackProvider
  const sandpackKey = useRef('stable-sandpack-key').current;

  return (
    <div className="h-full" style={{ overflow: 'hidden' }}>
      <style>
        {`
          @keyframes spin-slow {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .animate-spin-slow {
            animation: spin-slow 1s linear infinite;
          }
        `}
      </style>
      <div className="border-light-decorative-00 dark:border-dark-decorative-00 bg-light-background-00 dark:bg-dark-background-00 flex min-h-[4rem] items-center justify-between border-b px-6 py-4">
        {!showWelcome ? (
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex space-x-1 rounded-lg p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveView('preview')}
              className={`flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeView === 'preview'
                  ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
              }`}
              aria-label="Switch to preview"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${spinningIconClass}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Preview icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('code');
                // Hide welcome screen when switching to code view
                setShowWelcome(false);
              }}
              className={`flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeView === 'code'
                  ? 'bg-light-background-00 dark:bg-dark-background-00 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01'
              }`}
              aria-label="Switch to code editor"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Code icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <span>Code</span>
            </button>
          </div>
        ) : (
          <div className="h-10">
            {/* Empty div to maintain header height when buttons are hidden */}
          </div>
        )}

        {isStreaming && (
          <div className="text-accent-03-light dark:text-accent-03-dark ml-2 w-10 animate-pulse text-sm">
            {streamingCode.split('\n').length > 2 ? streamingCode.split('\n').length : ''}
          </div>
        )}

        {onShare ? (
          !showWelcome && (
            <div className="flex items-center gap-2">
              {shareStatus && (
                <div className="animate-fade-in bg-accent-00-light dark:bg-accent-00-dark text-light-primary dark:text-dark-primary rounded-lg px-3 py-1 text-sm">
                  {shareStatus}
                </div>
              )}
              <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 flex space-x-1 rounded-lg p-1 shadow-sm">
                <button
                  type="button"
                  onClick={onShare}
                  className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 flex items-center space-x-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
                  aria-label="Share app"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Share icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="h-10 w-10">
            {/* Empty space to maintain layout when no share button */}
          </div>
        )}
      </div>

      {showWelcome ? (
        // Show welcome screen
        <div className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
          <WelcomeScreen />
        </div>
      ) : (
        // Show sandbox
        <div data-testid="sandpack-provider">
          <SandpackProvider
            key={isStreaming ? 'streaming' : `${displayCode}-${restartCount}`} // P7bfe
            template="vite-react"
            options={{
              externalResources: ['https://cdn.tailwindcss.com'],
              classes: { 'sp-wrapper': 'h-full' },
            }}
            customSetup={{
              dependencies: {
                ...dependencies,
                ...sandpackDependencies,
              },
            }}
            files={filesRef.current}
            theme={isDarkMode ? 'dark' : 'light'}
          >
            <SandpackEventListener
              setActiveView={(view) => {
                // Always allow switching to preview on URL change events
                // Only restrict manual switching when lockCodeView is true
                setActiveView(view);
              }}
              setBundlingComplete={setBundlingComplete}
              isStreaming={isStreaming}
            />
            {isStreaming && <SandpackScrollController isStreaming={isStreaming} />}
            <SandpackLayout className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
              <div
                style={{
                  display: activeView === 'preview' ? 'block' : 'none',
                  height: '100%',
                  width: '100%',
                }}
              >
                <SandpackPreview
                  showNavigator={false}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={true}
                  showRestartButton={false}
                  showOpenNewtab={false}
                  className="h-full w-full"
                  style={{ height: '100%' }}
                />
              </div>
              <div
                style={{
                  display: activeView === 'code' ? 'block' : 'none',
                  height: '100%',
                  width: '100%',
                }}
                ref={codeEditorRef}
              >
                <SandpackCodeEditor
                  style={{ height: '100%' }}
                  showLineNumbers={false}
                  wrapContent
                  showInlineErrors
                />
              </div>
            </SandpackLayout>
          </SandpackProvider>
        </div>
      )}

      <div className="result-content">
        {!showWelcome && (
          <button
            data-testid="copy-button"
            onClick={() => navigator.clipboard.writeText(displayCode)}
            className="text-light-primary dark:text-dark-primary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
          >
            Copy to Clipboard
          </button>
        )}
        {streamingCode ? (
          <div>{currentStreamContent}</div>
        ) : (
          <div>{completedMessage || currentMessage?.content || ''}</div>
        )}
      </div>
    </div>
  );
}

export default ResultPreview;
