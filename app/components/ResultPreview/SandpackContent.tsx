import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useActiveCode,
  useSandpack,
} from '@codesandbox/sandpack-react';
import SandpackScrollController from './SandpackScrollController';
import type { SandpackFiles } from './ResultPreviewTypes';

const CodeEditorWrapper = () => {
  const { code } = useActiveCode();

  useEffect(() => {
    console.log('Code updated:', code);
  }, [code]);

  return (
    <SandpackCodeEditor
      style={{ height: '100%' }}
      showLineNumbers={false}
      wrapContent
      showInlineErrors
    />
  );
};

// Component to track code changes and provide a save button
const SaveButton = () => {
  const { sandpack } = useSandpack();
  const { activeFile, files } = sandpack;
  const { code } = useActiveCode();
  const [isModified, setIsModified] = useState(false);
  const [originalCode, setOriginalCode] = useState('');

  // Set original code on first load or when file changes
  useEffect(() => {
    if (files[activeFile]) {
      setOriginalCode(files[activeFile].code);
      setIsModified(false);
    }
  }, [activeFile, files]);

  // Check if code is modified compared to original
  useEffect(() => {
    if (originalCode && code !== originalCode) {
      setIsModified(true);
    } else {
      setIsModified(false);
    }
  }, [code, originalCode]);

  const handleSave = useCallback(() => {
    console.log('Saving file:', activeFile, code);
    // Here you would typically save the code to your app's state
    setOriginalCode(code); // Update original code reference
    setIsModified(false); // Reset modified state
  }, [activeFile, code]);

  return (
    <button 
      onClick={handleSave}
      disabled={!isModified}
      className={`px-3 py-1 mx-2 rounded ${isModified 
        ? 'bg-blue-500 text-white hover:bg-blue-600' 
        : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
    >
      Save
    </button>
  );
};

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
}) => {
  const codeEditorRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  return (
    <div data-testid="sandpack-provider">
      <SandpackProvider
        key={sandpackKey}
        template="vite-react"
        options={{
          externalResources: ['https://cdn.tailwindcss.com'],
          classes: { 'sp-wrapper': 'h-full' },
        }}
        customSetup={{
          dependencies: {
            'use-fireproof': '0.20.0-dev-preview-52',
            ...(dependencies || {}),
          },
        }}
        files={filesContent}
        theme={isDarkMode ? 'dark' : 'light'}
      >
        {/* Header with view toggle and save button */}
        <div className="flex items-center border-b border-gray-200 px-4 py-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('preview')}
              className={`px-3 py-1 rounded ${
                activeView === 'preview' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveView('code')}
              className={`px-3 py-1 rounded ${
                activeView === 'code' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Code
            </button>
          </div>
          <SaveButton />
        </div>
        
        <SandpackScrollController
          isStreaming={isStreaming}
          shouldEnableScrolling={isStreaming || !codeReady}
          codeReady={codeReady}
          activeView={activeView}
        />
        <SandpackLayout className="h-full" style={{ height: 'calc(100vh - 85px)' }}>
          <div
            style={{
              display: activeView === 'preview' ? 'block' : 'none',
              height: '100%',
              width: '100%',
            }}
          >
            {!isStreaming && (
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={true}
                showRestartButton={false}
                showOpenNewtab={false}
                className="h-full w-full"
                style={{ height: '100%' }}
              />
            )}
          </div>
          <div
            style={{
              display: activeView === 'code' ? 'block' : 'none',
              height: '100%',
              width: '100%',
            }}
            ref={codeEditorRef}
          >
            <CodeEditorWrapper />
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
};

export default SandpackContent;
