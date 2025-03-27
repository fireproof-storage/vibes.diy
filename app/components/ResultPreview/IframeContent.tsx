import React, { useEffect, useRef, useState } from 'react';
import type { IframeFiles } from './ResultPreviewTypes';
import { CALLAI_API_KEY } from '~/config/env';
import Editor from '@monaco-editor/react';

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
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
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

      // Use the template and replace placeholders
      const htmlContent = iframeTemplateRaw
        .replace('{{API_KEY}}', CALLAI_API_KEY)
        .replace('{{APP_CODE}}', normalizedCode);

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
          top: 0,
          left: 0,
        }}
      >
        <Editor
          height="100%"
          width="100%"
          language="javascript"
          theme={isDarkMode ? 'vs-dark' : 'light'}
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
          onMount={(editor, monaco: any) => {
            // Configure JavaScript language to support JSX
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
              jsx: monaco.languages.typescript.JsxEmit.React,
              jsxFactory: 'React.createElement',
              reactNamespace: 'React',
              allowNonTsExtensions: true,
              allowJs: true,
              target: monaco.languages.typescript.ScriptTarget.Latest
            });
            
            // Set editor options for better JSX visualization
            editor.updateOptions({
              tabSize: 2,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true }
            });
          }}
        />
      </div>
    </div>
  );
};

export default IframeContent;
