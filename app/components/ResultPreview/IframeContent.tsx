import React, { useEffect, useRef, useState } from 'react';
import type { IframeFiles } from './ResultPreviewTypes';
import Editor from '@monaco-editor/react';
import { useApiKey } from '~/hooks/useApiKey';
import { setupMonacoEditor } from './setupMonacoEditor';
import { transformImports } from './transformImports';
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
}

const IframeContent: React.FC<IframeContentProps> = ({
  activeView,
  filesContent,
  isStreaming,
  codeReady,
  isDarkMode,
  sessionId,
}) => {
  const { ensureApiKey } = useApiKey();
  const [apiKey, setApiKey] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Theme state is now received from parent via props
  const contentLoadedRef = useRef(false);
  const lastContentRef = useRef(''); // Use ref to track last rendered code

  // Reference to store the current Monaco editor instance
  const monacoEditorRef = useRef<any>(null);
  // Reference to store the Monaco API instance
  const monacoApiRef = useRef<any>(null);
  // Reference to store the current Shiki highlighter
  const highlighterRef = useRef<any>(null);
  // Reference to store disposables for cleanup
  const disposablesRef = useRef<{ dispose: () => void }[]>([]);
  // Flag to track if user has manually scrolled during streaming
  const userScrolledRef = useRef<boolean>(false);

  // Extract the current app code string
  const appCode = filesContent['/App.jsx']?.code || '';

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

  // This effect is now managed at the ResultPreview component level

  // Get API key on component mount
  useEffect(() => {
    const getApiKey = async () => {
      const keyData = await ensureApiKey();
      setApiKey(keyData.key);
    };

    getApiKey();
  }, [ensureApiKey]);

  // Update iframe when code is ready and API key is available
  useEffect(() => {
    if (codeReady && apiKey && iframeRef.current) {
      // Skip if content hasn't changed
      if (contentLoadedRef.current && appCode === lastContentRef.current) {
        return;
      }

      contentLoadedRef.current = true;
      lastContentRef.current = appCode; // Update ref

      // Use the extracted function to normalize component export patterns
      const normalizedCode = normalizeComponentExports(appCode);

      // Create a session ID variable for the iframe template
      const sessionIdValue = sessionId || 'default-session';

      const transformedCode = transformImports(normalizedCode);

      // Use the template and replace placeholders
      const htmlContent = iframeTemplateRaw
        .replace('{{API_KEY}}', apiKey)
        .replace('{{APP_CODE}}', transformedCode)
        .replace('{{SESSION_ID}}', sessionIdValue);

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      // Setup message listener for preview ready signal
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'preview-ready') {
          // bundlingComplete state is removed, no action needed here
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        URL.revokeObjectURL(url);
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [appCode, apiKey, codeReady]);

  // Determine which view to show based on URL path - gives more stable behavior on refresh
  const getViewFromPath = () => {
    const path = window.location.pathname;
    if (path.endsWith('/code')) return 'code';
    if (path.endsWith('/data')) return 'data';
    if (path.endsWith('/app')) return 'preview';
    return activeView; // Fall back to state if path doesn't have a suffix
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
        }}
      >
        <iframe
          ref={iframeRef}
          className="h-full w-full border-0"
          title="Preview"
          sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups-to-escape-sandbox allow-popups allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
          allow="accelerometer *; bluetooth *; camera *; encrypted-media *; display-capture *; geolocation *; gyroscope *; microphone *; midi *; clipboard-read *; clipboard-write *; web-share *; serial *; xr-spatial-tracking *"
          scrolling="auto"
          allowFullScreen={true}
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
            await setupMonacoEditor(editor, monaco, {
              isStreaming,
              codeReady,
              isDarkMode,
              userScrolledRef,
              disposablesRef,
              setRefs: (ed, mo) => {
                monacoEditorRef.current = ed;
                monacoApiRef.current = mo;
              },
              setHighlighter: (h) => {
                highlighterRef.current = h;
              },
            });
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
};

export default IframeContent;
