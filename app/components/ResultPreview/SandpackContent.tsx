import React, { useEffect, useRef, useState } from 'react';
import type { SandpackFiles } from './ResultPreviewTypes';

interface SandpackContentProps {
  activeView: 'preview' | 'code';
  filesContent: SandpackFiles;
  isStreaming: boolean;
  codeReady: boolean;
  sandpackKey: string;
  setActiveView: (view: 'preview' | 'code') => void;
  setBundlingComplete: (complete: boolean) => void;
  dependencies: Record<string, string>;
}

const SandpackContent: React.FC<SandpackContentProps> = ({
  activeView,
  filesContent,
  isStreaming,
  sandpackKey,
  codeReady,
  dependencies,
  setActiveView,
  setBundlingComplete,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const contentLoadedRef = useRef(false);
  const lastContentRef = useRef('');

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

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>AI Generated App</title>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              }
              #container {
                width: 100%;
                height: 100vh;
              }
            </style>
          </head>
          <body>
            <div id="container"></div>
            <script type="importmap">
              {
                "imports": {
                  "react": "https://esm.sh/react@19.0.0",
                  "react-dom/client": "https://esm.sh/react-dom@19.0.0/client",
                  "use-fireproof": "https://esm.sh/use-fireproof@0.20.0-dev-preview-57",
                  "call-ai": "https://esm.sh/call-ai@0.5.0"
                }
              }
            </script>
            <script type="text/babel" data-type="module">
              import ReactDOMClient from 'react-dom/client';
              ${normalizedCode}

              const rootElement = document.getElementById('container');
              ReactDOMClient.createRoot(rootElement).render(<App />);
              
              // Signal that the preview is ready
              // window.parent.postMessage({ type: 'preview-ready' }, '*');
            </script>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      // Setup message listener for preview ready signal
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'preview-ready') {
          setPreviewReady(true);
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
            allow="cross-origin-isolated"
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
          padding: '1rem',
          backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#000000',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
          top: 0,
          left: 0,
        }}
      >
        {filesContent['/App.jsx']?.code || ''}
      </div>
    </div>
  );
};

export default SandpackContent;
