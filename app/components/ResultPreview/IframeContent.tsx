import React, { useEffect, useRef } from 'react';
import type { IframeFiles } from './ResultPreviewTypes';
import { CALLAI_API_KEY } from '~/config/env';
import Editor from '@monaco-editor/react';
import { shikiToMonaco } from '@shikijs/monaco';
import { createHighlighter } from 'shiki';

// Import the iframe template using Vite's ?raw import option
import iframeTemplateRaw from './templates/iframe-template.html?raw';

interface IframeContentProps {
  activeView: 'preview' | 'code';
  filesContent: IframeFiles;
  isStreaming: boolean;
  codeReady: boolean;
  sandpackKey: string;
  setActiveView: (view: 'preview' | 'code') => void;
  setBundlingComplete: (complete: boolean) => void;
  dependencies: Record<string, string>;
  isDarkMode: boolean; // Add isDarkMode prop
}

const IframeContent: React.FC<IframeContentProps> = ({
  activeView,
  filesContent,
  isStreaming,
  sandpackKey,
  codeReady,
  dependencies,
  setActiveView,
  setBundlingComplete,
  isDarkMode, // Receive the isDarkMode prop
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Theme state is now received from parent via props
  const contentLoadedRef = useRef(false);
  const lastContentRef = useRef('');

  // Reference to store the current Monaco editor instance
  const monacoEditorRef = useRef<any>(null);
  // Reference to store the current Shiki highlighter
  const highlighterRef = useRef<any>(null);
  // Reference to store disposables for cleanup
  const disposablesRef = useRef<{ dispose: () => void }[]>([]);
  // Flag to track if user has manually scrolled during streaming
  const userScrolledRef = useRef<boolean>(false);
  // Store the last scroll top position to detect user-initiated scrolls
  const lastScrollTopRef = useRef<number>(0);
  // Store the last viewport height
  const lastViewportHeightRef = useRef<number>(0);

  // Theme detection is now handled in the parent component

  // Cleanup for disposables
  useEffect(() => {
    return () => {
      // Clean up all disposables when component unmounts
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
    };
  }, []);

  // Update theme when dark mode changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      // Update the Shiki theme in Monaco when dark mode changes from parent
      const currentTheme = isDarkMode ? 'github-dark' : 'github-light';
      monacoEditorRef.current.setTheme(currentTheme);
    }
  }, [isDarkMode]);

  // Reset manual scroll flag when streaming state changes
  useEffect(() => {
    if (isStreaming) {
      // Reset the flag when streaming starts
      userScrolledRef.current = false;
    }
  }, [isStreaming]);

  // This effect is now managed at the ResultPreview component level

  useEffect(() => {
    // Only load iframe content when necessary - if code is ready and content changed
    if (!isStreaming && codeReady && iframeRef.current) {
      const appCode = filesContent['/App.jsx']?.code || '';

      // Check if content has changed
      if (contentLoadedRef.current && lastContentRef.current === appCode) {
        return; // Skip if content already loaded and hasn't changed
      }

      // Update references
      contentLoadedRef.current = true;
      lastContentRef.current = appCode;

      // Replace any default export with a consistent App name
      const normalizedCode = appCode.replace(
        /export\s+default\s+function\s+(\w+)/,
        'export default function App'
      );

      // Transform bare import statements to use esm.sh URLs
      const transformImports = (code: string): string => {
        // This regex matches import statements with bare module specifiers
        // It specifically looks for import statements that don't start with /, ./, or ../
        return code.replace(
          /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"\/][^'"]*)['"];?/g,
          (match, importPath) => {
            // Skip transforming imports that are already handled in the importmap
            // Only skip the core libraries we have in our importmap
            if (
              ['react', 'react-dom', 'react-dom/client', 'use-fireproof', 'call-ai'].includes(
                importPath
              )
            ) {
              return match;
            }
            // Transform the import to use basic esm.sh URL
            return match.replace(`"${importPath}"`, `"https://esm.sh/${importPath}"`);
          }
        );
      };

      const transformedCode = transformImports(normalizedCode);

      // Use the template and replace placeholders
      const htmlContent = iframeTemplateRaw
        .replace('{{API_KEY}}', CALLAI_API_KEY)
        .replace('{{APP_CODE}}', transformedCode);

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      // Setup message listener for preview ready signal
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'preview-ready') {
          setBundlingComplete(true);
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        URL.revokeObjectURL(url);
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [isStreaming, codeReady, filesContent, setBundlingComplete]);

  return (
    <div data-testid="sandpack-provider" className="h-full">
      <div
        style={{
          visibility: activeView === 'preview' ? 'visible' : 'hidden',
          position: activeView === 'preview' ? 'static' : 'absolute',
          zIndex: activeView === 'preview' ? 1 : 0,
          height: '100%',
          width: '100%',
          top: 0,
          left: 0,
        }}
      >
        {!isStreaming && (
          <iframe
            ref={iframeRef}
            className="h-full w-full border-0"
            title="Preview"
            sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups-to-escape-sandbox allow-popups allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
            allow="accelerometer *; bluetooth *; camera *; encrypted-media *; display-capture *; geolocation *; gyroscope *; microphone *; midi *; clipboard-read *; clipboard-write *; web-share *; serial *; xr-spatial-tracking *"
            scrolling="auto"
            allowTransparency={true}
            allowFullScreen={true}
          />
        )}
      </div>
      <div
        style={{
          visibility: activeView === 'code' ? 'visible' : 'hidden',
          position: activeView === 'code' ? 'static' : 'absolute',
          zIndex: activeView === 'code' ? 1 : 0,
          height: '100%',
          width: '100%',
          top: 0,
          left: 0,
        }}
      >
        <Editor
          height="100%"
          width="100%"
          path="file.jsx"
          defaultLanguage="jsx"
          theme={isDarkMode ? 'github-dark' : 'github-light'}
          value={filesContent['/App.jsx']?.code || ''}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            padding: { top: 16 },
          }}
          onMount={async (editor, monacoInstance: any) => {
            // Store references for theme updates
            monacoEditorRef.current = monacoInstance.editor;

            // Set up throttled scrolling to bottom when streaming code
            if (isStreaming && !codeReady) {
              let lastScrollTime = 0;
              const scrollThrottleMs = 30; // Fixed throttle time of 30ms

              // Initialize with current time and positions
              lastScrollTime = Date.now();
              const initialScrollTop = editor.getScrollTop();
              lastScrollTopRef.current = initialScrollTop;
              lastViewportHeightRef.current = editor.getLayoutInfo().height;

              // Track if editor is fully initialized
              let editorInitialized = false;
              // Longer delay to ensure full initialization
              setTimeout(() => {
                editorInitialized = true;
                // Update the baseline scroll position after initialization
                lastScrollTopRef.current = editor.getScrollTop();
              }, 1000);

              // Detect only genuine user-initiated scrolling
              const scrollDisposable = editor.onDidScrollChange((e) => {
                if (!editorInitialized || userScrolledRef.current) {
                  // Skip if not initialized or already detected user scroll
                  return;
                }

                const currentTime = Date.now();
                const timeSinceAutoScroll = currentTime - lastScrollTime;
                const currentScrollTop = e.scrollTop;
                const currentViewportHeight = editor.getLayoutInfo().height;

                // Check for significant viewport height changes (e.g., window resize)
                const viewportChanged =
                  Math.abs(currentViewportHeight - lastViewportHeightRef.current) > 5;
                if (viewportChanged) {
                  // If viewport changed, update reference and skip this event
                  lastViewportHeightRef.current = currentViewportHeight;
                  return;
                }

                // Only detect as manual scroll if:
                // 1. Not too close to our auto-scroll action (at least 200ms after)
                // 2. Not close to initialization
                // 3. Scrolled a significant amount from last position
                const scrollDelta = Math.abs(currentScrollTop - lastScrollTopRef.current);
                if (timeSinceAutoScroll > 200 && scrollDelta > 20) {
                  userScrolledRef.current = true;
                }

                // Update last scroll position for next comparison
                lastScrollTopRef.current = currentScrollTop;
              });

              // Auto-scroll on content change, but only if user hasn't manually scrolled
              const contentDisposable = editor.onDidChangeModelContent(() => {
                const now = Date.now();
                if (now - lastScrollTime > scrollThrottleMs && !userScrolledRef.current) {
                  lastScrollTime = now;

                  // Get the model and scroll to the last line
                  const model = editor.getModel();
                  if (model) {
                    const lineCount = model.getLineCount();
                    editor.revealLineNearTop(lineCount);
                  }
                }
              });

              // Create a cleanup event listener
              const editorDisposable = editor.onDidDispose(() => {
                scrollDisposable.dispose();
                contentDisposable.dispose();
              });

              // Store disposables in the ref for cleanup
              disposablesRef.current.push(scrollDisposable, contentDisposable, editorDisposable);
            }

            // Configure JavaScript language to support JSX
            monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
              jsx: monacoInstance.languages.typescript.JsxEmit.React,
              jsxFactory: 'React.createElement',
              reactNamespace: 'React',
              allowNonTsExtensions: true,
              allowJs: true,
              target: monacoInstance.languages.typescript.ScriptTarget.Latest,
            });

            // Set editor options for better visualization
            editor.updateOptions({
              tabSize: 2,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
            });

            try {
              // Register the language IDs first
              monacoInstance.languages.register({ id: 'jsx' });
              monacoInstance.languages.register({ id: 'javascript' });

              // Create the Shiki highlighter with both light and dark themes, prioritize dark
              const highlighter = await createHighlighter({
                themes: ['github-dark', 'github-light'],
                langs: ['javascript', 'jsx'],
              });

              // Store highlighter reference for theme switching
              highlighterRef.current = highlighter;

              // Apply Shiki to Monaco
              shikiToMonaco(highlighter, monacoInstance);

              // Set theme based on current dark mode state from parent
              const currentTheme = isDarkMode ? 'github-dark' : 'github-light';
              monacoInstance.editor.setTheme(currentTheme);

              // Make sure the model uses JSX highlighting
              const model = editor.getModel();
              if (model) {
                monacoInstance.editor.setModelLanguage(model, 'jsx');
              }
            } catch (error) {
              console.warn('Shiki highlighter setup failed:', error);
            }
          }}
        />
      </div>
    </div>
  );
};

export default IframeContent;
