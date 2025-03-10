import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { sandpackDependencies } from '../../utils/versions';
import WelcomeScreen from './WelcomeScreen';
import SandpackEventListener from './SandpackEventListener';
import SandpackScrollController from './SandpackScrollController';

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
  onScreenshotCaptured?: (screenshotData: string) => void;
  initialView?: 'code' | 'preview';
  sessionId?: string;
}

const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
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

      function captureScreenshot() {
        html2canvas(document.body).then(canvas => {
          const dataURI = canvas.toDataURL();
          window.parent.postMessage({ screenshot: dataURI }, '*');
        });
      }
      
      // Automatically capture screenshot when page is fully loaded
      window.addEventListener('load', function() {
        // Wait a short moment for any final rendering
        setTimeout(captureScreenshot, 500);
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>`;

const defaultCode = '';

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
  onScreenshotCaptured,
  initialView = 'preview',
  sessionId,
}: ResultPreviewProps) {
  const [activeView, setActiveView] = useState<'preview' | 'code'>(initialView);
  const [displayCode, setDisplayCode] = useState(code || defaultCode);
  const [appStartedCount, setAppStartedCount] = useState(0);
  const [bundlingComplete, setBundlingComplete] = useState(true);
  const justFinishedStreamingRef = useRef(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const codeEditorRef = useRef<HTMLDivElement>(null);
  const [lockCodeView, setLockCodeView] = useState(false);
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

  // Keep the refs for streaming values to reduce parent rerenders
  const streamingCodeRef = useRef(streamingCode);
  const isStreamingRef = useRef(isStreaming);
  const currentStreamContentRef = useRef(currentStreamContent);

  // Keep the local state for UI updates
  const [localStreamingCode, setLocalStreamingCode] = useState(streamingCode);
  const [localIsStreaming, setLocalIsStreaming] = useState(isStreaming);
  const [localStreamContent, setLocalStreamContent] = useState(currentStreamContent);

  // Keep the effect that updates refs and local state
  useEffect(() => {
    const streamingChanged = isStreaming !== isStreamingRef.current;
    
    streamingCodeRef.current = streamingCode;
    isStreamingRef.current = isStreaming;
    currentStreamContentRef.current = currentStreamContent;

    setLocalStreamingCode(streamingCode);
    setLocalIsStreaming(isStreaming);
    setLocalStreamContent(currentStreamContent);
    
    if (streamingChanged) {
      console.log('Streaming state changed:', isStreaming ? 'started' : 'stopped');
    }
  }, [streamingCode, isStreaming, currentStreamContent]);

  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDarkMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.screenshot) {
        const screenshotData = event.data.screenshot;
        console.log('Received screenshot from iframe, length:', screenshotData.length);

        if (onScreenshotCaptured) {
          onScreenshotCaptured(screenshotData);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onScreenshotCaptured]);

  useEffect(() => {
    if (!localIsStreaming) {
      const codeWithWhitespace =
        cleanCodeBeforeImport(code || defaultCode) +
        '\n\n\n\n\n\n\n\n\n\n' +
        '\n\n\n\n\n\n\n\n\n\n' +
        '\n';
      setDisplayCode(codeWithWhitespace);

      filesRef.current = {
        '/index.html': {
          code: indexHtml,
          hidden: true,
        },
        '/App.jsx': {
          code: codeWithWhitespace,
          active: true,
        },
      };

      if (code) {
        setShowWelcome(false);
      }

      console.log('ResultPreview: Updated files with new code, length:', (code || '').length);
      
      // We don't force view changes here, let the streaming state effect handle it
    }
  }, [code, localIsStreaming, sessionId]);

  useEffect(() => {
    if (localIsStreaming) {
      if (localStreamingCode) {
        const codeWithWhitespace =
          cleanCodeBeforeImport(localStreamingCode) + '\n\n\n\n\n\n\n\n\n\n';
        setDisplayCode(codeWithWhitespace);

        filesRef.current = {
          ...filesRef.current,
          '/App.jsx': {
            code: codeWithWhitespace,
            active: true,
          },
        };

        setShowWelcome(false);
        setActiveView('code');
        setLockCodeView(true);
      }
    }
  }, [localStreamingCode, localIsStreaming]);

  useEffect(() => {
    if (!localIsStreaming) {
      setLockCodeView(false);
    }
  }, [localIsStreaming]);

  useEffect(() => {
    if (localIsStreaming && localStreamingCode) {
      justFinishedStreamingRef.current = true;
    }
  }, [localIsStreaming, localStreamingCode]);

  useEffect(() => {
    if (bundlingComplete) {
      justFinishedStreamingRef.current = false;
    }
  }, [bundlingComplete]);

  const shouldSpin = !localIsStreaming && justFinishedStreamingRef.current && !bundlingComplete;

  const spinningIconClass = shouldSpin ? 'animate-spin-slow' : '';

  // Memoize the dependencies for Sandpack
  const depsString = useMemo(() => JSON.stringify(dependencies), [dependencies]);

  const sandpackDependencies = useMemo(() => {
    // Ensure use-fireproof is included in the dependencies
    return {
      'use-fireproof': '0.20.0-dev-preview-52',
      ...dependencies,
    };
  }, [depsString]);

  // Create a unique key for SandpackProvider that changes when sessionId or code changes
  const sandpackKey = useMemo(() => {
    // Using Date.now() causes unnecessary remounts on every render
    // Instead, use the actual content that should trigger a remount
    const key = `${sessionId || 'default'}-${localIsStreaming ? 'streaming' : 'static'}-${code.length}`;
    console.log('ResultPreview: Generated new sandpackKey:', key, 'for sessionId:', sessionId);
    return key;
  }, [sessionId, localIsStreaming, code]);

  // Log when sessionId changes
  useEffect(() => {
    if (sessionId) {
      console.log('ResultPreview: sessionId changed to:', sessionId);
      console.log('ResultPreview: current code length:', (code || '').length);
    }
  }, [sessionId, code]);

  // Track streaming state changes specifically for view transitions
  useEffect(() => {
    // When streaming stops and we have code, switch to code view
    if (!localIsStreaming && localStreamingCode && activeView === 'preview') {
      console.log('Streaming stopped, switching to code view');
      setActiveView('code');
    }
  }, [localIsStreaming, localStreamingCode, activeView]);

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
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeView === 'preview'
                  ? 'bg-light-background-contrast dark:bg-dark-background-contrast text-foreground'
                  : 'hover:bg-light-background-subtle dark:hover:bg-dark-background-subtle text-light-fg-subtle dark:text-dark-fg-subtle'
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveView('code')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeView === 'code'
                  ? 'bg-light-background-contrast dark:bg-dark-background-contrast text-foreground'
                  : 'hover:bg-light-background-subtle dark:hover:bg-dark-background-subtle text-light-fg-subtle dark:text-dark-fg-subtle'
              }`}
            >
              Code
            </button>
          </div>
        ) : (
          <div className="h-10"></div>
        )}

        {localIsStreaming && (
          <div className="text-accent-03-light dark:text-accent-03-dark ml-2 w-10 animate-pulse text-sm">
            {localStreamingCode.split('\n').length > 2 ? localStreamingCode.split('\n').length : ''}
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
          <div className="h-10 w-10"></div>
        )}
      </div>

      {showWelcome ? (
        <div className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
          <WelcomeScreen />
        </div>
      ) : (
        <div data-testid="sandpack-provider">
          <SandpackProvider
            key={sandpackKey}
            template="vite-react"
            options={{
              externalResources: ['https://cdn.tailwindcss.com'],
              classes: { 'sp-wrapper': 'h-full' },
            }}
            customSetup={{
              dependencies: sandpackDependencies,
            }}
            files={filesRef.current}
            theme={isDarkMode ? 'dark' : 'light'}
          >
            <SandpackEventListener
              setActiveView={(view) => {
                setActiveView(view);
              }}
              setBundlingComplete={setBundlingComplete}
              isStreaming={localIsStreaming}
            />
            {localIsStreaming && <SandpackScrollController isStreaming={localIsStreaming} />}
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
        {localStreamingCode ? (
          <div>{localStreamContent}</div>
        ) : (
          <div>{completedMessage || currentMessage?.content || ''}</div>
        )}
      </div>
    </div>
  );
}

function cleanCodeBeforeImport(codeString: string) {
  return codeString.replace(/^[\s\S]*?(import|export)/, '$1');
}

export default ResultPreview;
