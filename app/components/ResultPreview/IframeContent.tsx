import React, { useEffect, useRef, useMemo } from 'react';
import type { IframeFiles } from './ResultPreviewTypes';
import Editor from '@monaco-editor/react';
import { shikiToMonaco } from '@shikijs/monaco';
import { createHighlighter } from 'shiki';
import { DatabaseListView } from './DataView';
import { normalizeComponentExports } from '../../utils/normalizeComponentExports';

// Import the iframe template using Vite's ?raw import option
import iframeTemplateRaw from './templates/iframe-template.html?raw';

interface IframeContentProps {
  activeView: 'preview' | 'code' | 'data';
  filesContent: IframeFiles;
  isStreaming: boolean;
  codeReady: boolean;
  isDarkMode: boolean;
  sessionId?: string;
  apiKey: string | undefined; // Allow apiKey to be undefined initially
}

export const IframeContent = React.forwardRef<HTMLIFrameElement, IframeContentProps>(
  ({ activeView, filesContent, isStreaming, codeReady, isDarkMode, sessionId, apiKey }, ref) => {
    // Theme state is now received from parent via props
    const contentLoadedRef = useRef(false);
    const lastContentRef = useRef(''); // Use ref to track last rendered code

    // Reference to store disposables for cleanup
    const disposablesRef = useRef<{ dispose: () => void }[]>([]);
    // Flag to track if user has manually scrolled during streaming
    const userScrolledRef = useRef<boolean>(false);
    // Store the last scroll top position to detect user-initiated scrolls
    const lastScrollTopRef = useRef<number>(0);
    // Store the last viewport height for auto-scrolling
    const lastViewportHeightRef = useRef<number>(0);
    // Reference to store the current Monaco editor instance
    const monacoEditorRef = useRef<any>(null);
    // Reference to store the Monaco API instance
    const monacoApiRef = useRef<any>(null);
    // Reference to store the current Shiki highlighter
    const highlighterRef = useRef<any>(null);

    // Extract the current app code string
    const appCode = filesContent['/App.jsx']?.code || '';
    const normalizedCode = normalizeComponentExports(appCode);

    // Transform imports function
    const transformImports = (code: string): string => {
      return code.replace(
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"']([^'"'][^'"']*)['"'];?/g,
        (match, importPath: string) => {
          if (
            [
              'react',
              'react-dom',
              'react-dom/client',
              'use-fireproof',
              'call-ai',
              'use-vibes',
            ].includes(importPath)
          ) {
            return match;
          }
          return match.replace(`"${importPath}"`, `"https://esm.sh/${importPath}"`);
        }
      );
    };

    const transformedCode = transformImports(normalizedCode);
    const sessionIdValue = sessionId || 'default-session';

    // Memoize htmlContent to avoid unnecessary re-renders
    const htmlContent = useMemo(() => {
      return iframeTemplateRaw
        .replace(/\{\{API_KEY\}\}/g, apiKey || '')
        .replace(/\{\{APP_CODE\}\}/g, transformedCode)
        .replace(/\{\{SESSION_ID\}\}/g, sessionIdValue)
        .replace(/\{\{THEME\}\}/g, isDarkMode ? 'dark' : 'light');
    }, [apiKey, transformedCode, sessionIdValue, isDarkMode]);

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
      if (monacoApiRef.current) {
        // Update the Shiki theme in Monaco when dark mode changes from parent
        const currentTheme = isDarkMode ? 'github-dark' : 'github-light';
        // Use monaco editor namespace to set theme
        monacoApiRef.current.editor.setTheme(currentTheme);
      }
    }, [isDarkMode]);

    // Reset manual scroll flag when streaming state changes
    useEffect(() => {
      if (isStreaming) {
        // Reset the flag when streaming starts
        userScrolledRef.current = false;
      }
    }, [isStreaming]);

    // Effect to update iframe src when code is ready
    useEffect(() => {
      // Type guard to ensure ref is a RefObject and not a function
      const isRefObject = (
        ref: React.ForwardedRef<HTMLIFrameElement>
      ): ref is React.RefObject<HTMLIFrameElement> => ref !== null && typeof ref !== 'function';

      // Only proceed if code is ready and ref is valid
      if (codeReady && ref && isRefObject(ref)) {
        // Skip if content hasn't changed
        if (contentLoadedRef.current && appCode === lastContentRef.current) {
          return;
        }

        // Update last content ref
        lastContentRef.current = appCode;

        // Create a blob and set iframe src
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        if (ref.current) {
          ref.current.src = url;
        }

        // Setup message listener for preview ready signal
        const handleMessage = (event: MessageEvent) => {
          if (event.data && event.data.type === 'preview-ready') {
            contentLoadedRef.current = true;
          }
        };

        window.addEventListener('message', handleMessage);

        return () => {
          URL.revokeObjectURL(url);
          window.removeEventListener('message', handleMessage);
        };
      }
    }, [codeReady, ref, htmlContent, appCode]);

    // Determine which view to show based on URL path
    const getViewFromPath = (): 'preview' | 'code' | 'data' => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.includes('/code')) return 'code';
        if (path.includes('/data')) return 'data';
      }
      return 'preview';
    };

    // Get view from URL path
    const currentView = getViewFromPath();

    return (
      <div data-testid="sandpack-provider" className="h-full">
        <div
          style={{
            visibility: currentView === 'preview' ? 'visible' : 'hidden',
            position: currentView === 'preview' ? 'static' : 'absolute',
            zIndex: currentView === 'preview' ? 1 : 0,
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            pointerEvents: currentView === 'preview' ? 'auto' : 'none',
          }}
        >
          <iframe
            title="Preview"
            ref={ref}
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            allow="camera; microphone; xr-spatial-tracking;"
            loading="eager"
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              background: isDarkMode ? '#1e1e1e' : '#ffffff',
            }}
          />
        </div>
        <div
          style={{
            visibility: currentView === 'code' ? 'visible' : 'hidden',
            position: currentView === 'code' ? 'static' : 'absolute',
            zIndex: currentView === 'code' ? 1 : 0,
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
            onMount={async (editor, monaco) => {
              // Store the editor instance for later reference
              monacoEditorRef.current = editor;
              // Store the Monaco API instance for theme changes
              monacoApiRef.current = monaco;

              // Configure JavaScript language to support JSX
              monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                jsx: monaco.languages.typescript.JsxEmit.React,
                jsxFactory: 'React.createElement',
                reactNamespace: 'React',
                allowNonTsExtensions: true,
                allowJs: true,
                target: monaco.languages.typescript.ScriptTarget.Latest,
              });

              // Set editor options for better visualization
              editor.updateOptions({
                tabSize: 2,
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
              });

              // Register the language IDs first
              monaco.languages.register({ id: 'jsx' });
              monaco.languages.register({ id: 'javascript' });

              // Add auto-scrolling for streaming code
              if (isStreaming && !codeReady) {
                let lastScrollTime = 0;
                const scrollThrottleMs = 30;

                // Initialize positions
                lastScrollTime = Date.now();
                lastScrollTopRef.current = editor.getScrollTop();
                lastViewportHeightRef.current = editor.getLayoutInfo().height;

                // Auto-scroll on content change, but only if user hasn't manually scrolled
                const contentDisposable = editor.onDidChangeModelContent(() => {
                  const now = Date.now();
                  if (now - lastScrollTime > scrollThrottleMs && !userScrolledRef.current) {
                    lastScrollTime = now;
                    const model = editor.getModel();
                    if (model) {
                      const lineCount = model.getLineCount();
                      editor.revealLineNearTop(lineCount);
                    }
                  }
                });

                // Store disposable for cleanup
                disposablesRef.current.push(contentDisposable);
              }

              try {
                // Create the Shiki highlighter with both light and dark themes
                const highlighter = await createHighlighter({
                  themes: ['github-dark', 'github-light'],
                  langs: ['javascript', 'jsx', 'typescript', 'tsx'],
                });
                // Store highlighter reference for theme switching
                highlighterRef.current = highlighter;

                // Apply Shiki to Monaco
                await shikiToMonaco(highlighter, monaco);

                // Set theme based on current dark mode state
                const currentTheme = isDarkMode ? 'github-dark' : 'github-light';
                monaco.editor.setTheme(currentTheme);

                // Make sure the model uses JSX highlighting
                const model = editor.getModel();
                if (model) {
                  monaco.editor.setModelLanguage(model, 'jsx');
                }
              } catch (error) {
                console.warn('Shiki highlighter setup failed:', error);
              }

              // Handle scroll events to detect manual user scrolling
              editor.onDidScrollChange((e) => {
                const scrollTop = e.scrollTop;
                // If there's a significant difference, consider it a manual scroll
                if (Math.abs(scrollTop - lastScrollTopRef.current) > 30) {
                  userScrolledRef.current = true;
                }
                lastScrollTopRef.current = scrollTop;
              });
            }}
            onChange={(value) => {
              // Nothing to do here as we've set readOnly to true
            }}
          />
        </div>
        <div
          style={{
            visibility: currentView === 'data' ? 'visible' : 'hidden',
            position: currentView === 'data' ? 'static' : 'absolute',
            zIndex: currentView === 'data' ? 1 : 0,
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            padding: '0px',
            overflow: 'auto',
          }}
        >
          <div className="data-container">
            <DatabaseListView
              appCode={filesContent['/App.jsx']?.code || ''}
              sessionId={sessionId || 'default-session'}
            />
          </div>
        </div>
      </div>
    );
  }
);

// Add display name for better debugging in React DevTools
IframeContent.displayName = 'IframeContent';

export default IframeContent;
