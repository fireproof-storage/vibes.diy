import React, { useEffect, useRef, useState } from 'react';
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
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const contentLoadedRef = useRef(false);
  const lastContentRef = useRef('');

  // Reference to store the current Monaco editor instance
  const monacoEditorRef = useRef<any>(null);
  // Reference to store the current Shiki highlighter
  const highlighterRef = useRef<any>(null);
  
  useEffect(() => {
    // Only switch to light mode if explicitly detected on the document
    const isLightMode = !document.documentElement.classList.contains('dark');
    console.log('Light mode explicitly detected:', isLightMode);
    
    // Only update if we need to switch to light mode
    if (isLightMode) {
      setIsDarkMode(false);
    }

    // Set up observer to watch for class changes on document.documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Only switch to light mode if dark class is explicitly removed
          const isLightModeNow = !document.documentElement.classList.contains('dark');
          console.log('Light mode detected:', isLightModeNow);
          setIsDarkMode(!isLightModeNow);
        }
      });
    });

    // Start observing
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);
  
  // Update theme when dark mode changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      // Update the Shiki theme in Monaco when dark mode changes
      const currentTheme = isDarkMode ? 'github-dark' : 'github-light';
      monacoEditorRef.current.setTheme(currentTheme);
    }
  }, [isDarkMode]);

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
          path="file.jsx"
          defaultLanguage="jsx"
          theme="github-dark" // Always use dark theme in initial render
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
            
            // Configure JavaScript language to support JSX
            monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
              jsx: monacoInstance.languages.typescript.JsxEmit.React,
              jsxFactory: 'React.createElement',
              reactNamespace: 'React',
              allowNonTsExtensions: true,
              allowJs: true,
              target: monacoInstance.languages.typescript.ScriptTarget.Latest
            });
            
            // Set editor options for better visualization
            editor.updateOptions({
              tabSize: 2,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true }
            });
            
            try {
              // Register the language IDs first
              monacoInstance.languages.register({ id: 'jsx' });
              monacoInstance.languages.register({ id: 'javascript' });
              
              // Create the Shiki highlighter with both light and dark themes, prioritize dark
              const highlighter = await createHighlighter({
                themes: ['github-dark', 'github-light'],
                langs: ['javascript', 'jsx']
              });
              
              // Store highlighter reference for theme switching
              highlighterRef.current = highlighter;
              
              // Apply Shiki to Monaco
              shikiToMonaco(highlighter, monacoInstance);
              
              // Start with dark theme, even before state is fully processed
              monacoInstance.editor.setTheme('github-dark');
              
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
