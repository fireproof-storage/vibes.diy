import React, { useRef, useState, useEffect } from 'react';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
import SandpackScrollController from './SandpackScrollController';
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
            'call-ai': '0.2.1',
            ...(dependencies || {}),
          },
        }}
        files={filesContent}
        theme={isDarkMode ? 'dark' : 'light'}
      >
        <SandpackScrollController
          isStreaming={isStreaming}
          shouldEnableScrolling={isStreaming || !codeReady}
          codeReady={codeReady}
          activeView={activeView}
        />
        <SandpackLayout className="h-full" style={{ height: 'calc(100vh - 49px)' }}>
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
  );
};

export default SandpackContent;
