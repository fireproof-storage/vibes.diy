# WebContainer Implementation Proposal

## Target API: WebContainerContent Component

```typescript
// app/components/ResultPreview/WebContainerContent.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { WebContainer } from '@webcontainer/api';
import type { SandpackFiles } from './ResultPreviewTypes';

interface WebContainerContentProps {
  activeView: 'preview' | 'code';
  filesContent: SandpackFiles;
  isStreaming: boolean;
  codeReady: boolean;
  sandpackKey: string;
  setActiveView: (view: 'preview' | 'code') => void;
  setBundlingComplete: (complete: boolean) => void;
  dependencies: Record<string, string>;
}

const WebContainerContent: React.FC<WebContainerContentProps> = ({
  activeView,
  filesContent,
  isStreaming,
  sandpackKey,
  codeReady,
  setActiveView,
  setBundlingComplete,
  dependencies,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const webContainerRef = useRef<WebContainer | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeFile, setActiveFile] = useState('App.jsx');

  // Initialize WebContainer and handle mode changes
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDarkMode);

    // Initialize WebContainer
    const initWebContainer = async () => {
      try {
        // Boot WebContainer for preview
        const instance = await WebContainer.boot();
        webContainerRef.current = instance;

        // Mount the files
        await instance.mount(convertSandpackToWebContainerFiles(filesContent));

        // Install dependencies
        await installDependencies(instance, dependencies);

        // Start a dev server
        await instance.spawn('npm', ['run', 'dev']);

        // Notify that bundling is complete
        setBundlingComplete(true);
      } catch (error) {
        console.error('WebContainer initialization failed:', error);
      }
    };

    if (!isStreaming && codeReady) {
      initWebContainer();
    }

    // Listen for dark mode changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      // Cleanup WebContainer (note: current API has limitations with teardown)
      // webContainerRef.current?.teardown();
    };
  }, [codeReady, isStreaming, filesContent, dependencies, setBundlingComplete]);

  // Handle file changes
  const handleFileChange = async (content: string) => {
    if (!webContainerRef.current || !codeReady) return;
    await webContainerRef.current.fs.writeFile(activeFile, content);
  };

  // Convert Sandpack files format to WebContainer format
  const convertSandpackToWebContainerFiles = (files: SandpackFiles) => {
    const webContainerFiles: Record<string, any> = {};

    Object.entries(files).forEach(([path, fileContent]) => {
      webContainerFiles[path] = {
        file: {
          contents: fileContent.code
        }
      };
    });

    return webContainerFiles;
  };

  // Install dependencies from the dependencies object
  const installDependencies = async (instance: WebContainer, deps: Record<string, string>) => {
    // Create a package.json with the dependencies
    const packageJson = {
      name: "app",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: deps
    };

    await instance.fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));

    // Run npm install
    const installProcess = await instance.spawn('npm', ['install']);
    return installProcess.exit;
  };

  return (
    <div data-testid="webcontainer-content" className="h-full">
      <div
        style={{
          display: activeView === 'preview' ? 'block' : 'none',
          height: '100%',
          width: '100%',
        }}
      >
        {!isStreaming && (
          <iframe
            ref={previewRef}
            className="h-full w-full border-0"
            title="Preview"
            allow="cross-origin-isolated"
          />
        )}
      </div>
      <div
        style={{
          display: activeView === 'code' ? 'block' : 'none',
          height: '100%',
          width: '100%',
        }}
        ref={editorRef}
      >
        <Editor
          height="100%"
          theme={isDarkMode ? 'vs-dark' : 'light'}
          path={activeFile}
          defaultValue={filesContent[activeFile]?.code || ''}
          onChange={handleFileChange}
          options={{
            readOnly: !codeReady,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};

export default WebContainerContent;
```

## Implementation Notes for Existing Files

Based on the project structure, here's where the implementation needs to happen:

1. **Main Files to Modify**:
   - `app/components/ResultPreview/ResultPreview.tsx`: Replace SandpackContent with WebContainerContent
   - Create new file: `app/components/ResultPreview/WebContainerContent.tsx` (as shown above)

2. **Related Files in the project structure**:
   - `app/components/ResultPreview/ResultPreviewTypes.ts`: May need to update types
   - `app/components/ResultPreview/ResultPreviewUtils.ts`: May need updates for WebContainer conversion
   - `app/components/ResultPreview/ResultPreviewTemplates.ts`: Update for WebContainer compatibility

3. **Integration Points**:
   - The existing SandpackContent implementation at `app/components/ResultPreview/SandpackContent.tsx`
   - The ResultPreview component at `app/components/ResultPreview/ResultPreview.tsx` currently has this critical integration point:
     ```typescript
     <SandpackContent
       activeView={activeView}
       filesContent={filesRef.current}
       isStreaming={!codeReady}
       codeReady={codeReady}
       sandpackKey={sandpackKey}
       setActiveView={setActiveView}
       setBundlingComplete={setBundlingComplete}
       dependencies={dependencies}
     />
     ```
   - This will be replaced with the WebContainerContent component with the same props interface

## Goals

1. Provide in-browser Node.js runtime capabilities for live code execution
2. Enable fast code streaming before code is ready, with editing afterward
3. Create a lightweight preview that updates in real-time
4. Maintain a simple, focused codebase with minimal complexity
5. Replace current sandboxing solution with WebContainer API
6. Achieve zero server-side compute for code execution

## Principles

1. **Simplicity First**: Implement only what's necessary, nothing more. As validated by [StackBlitz's approach](https://github.com/stackblitz/webcontainer-docs), reduced complexity leads to faster loading and simpler debugging.
2. **Performance Focused**: Optimize for fast initialization and responsive editing. WebContainer's browser-based approach eliminates network latency that would otherwise affect user experience.
3. **Single Path**: Avoid option flags and configuration complexity. Having a single, predictable execution path improves maintainability.
4. **Direct Integration**: Leverage WebContainer's built-in capabilities without abstractions. Adding layers between the API and your implementation often increases complexity without adding value.
5. **User Experience**: Prioritize immediate feedback and smooth interaction. Show code immediately (even read-only) to keep users engaged from the first second, as recommended by [Expo's Monaco implementation guide](https://blog.expo.dev/building-a-code-editor-with-monaco-f84b3a06deaf).

## Implementation Plan

### 1. Set Up Project Dependencies

```bash
npm install @webcontainer/api@1.1.8 @monaco-editor/react
```

Add the required COOP/COEP headers to our server configuration. These are essential for WebContainer to function properly, as they enable proper isolation for secure code execution:

```typescript
// In next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};
```

> **Note**: These headers are critical for deployment to cloud providers like Vercel or Netlify. Without them, WebContainer initialization will fail in production environments.

### 2. Create WebContainer Context Provider

Create a provider to handle WebContainer lifecycle and share the instance across components. Using the Context API pattern ensures that all components have access to the same WebContainer instance, reducing resource usage and preventing lifecycle conflicts:

```typescript
// app/providers/WebContainerProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { WebContainer, FileSystemTree } from '@webcontainer/api';

export type Template = {
  files: FileSystemTree;
  entry: string;
  visibleFiles: string[];
};

type WebContainerContextType = {
  webContainer: WebContainer | null;
  template: Template;
  isLoading: boolean;
  codeReady: boolean;
};

const WebContainerContext = createContext<WebContainerContextType>({
  webContainer: null,
  template: {} as Template,
  isLoading: true,
  codeReady: false,
});

export function useWebContainer() {
  const context = useContext(WebContainerContext);
  if (!context) {
    throw new Error('useWebContainer must be used within a WebContainerProvider');
  }
  return context;
}

export default function WebContainerProvider({
  template,
  children
}: {
  template: Template;
  children: React.ReactNode
}) {
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [codeReady, setCodeReady] = useState(false);

  useEffect(() => {
    let instance: WebContainer | null = null;

    const initWebContainer = async () => {
      try {
        setIsLoading(true);

        // Boot WebContainer - this is the most resource-intensive step
        instance = await WebContainer.boot();

        // Mount the template files to the filesystem
        await instance.mount(template.files);
        setWebContainer(instance);

        // Install dependencies - showing the editor as read-only during this phase
        // keeps users engaged while heavy operations complete
        const installProcess = await instance.spawn('npm', ['install']);
        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          console.error('Failed to install dependencies');
          return;
        }

        // Start dev server - Vite provides HMR out of the box
        await instance.spawn('npm', ['run', 'dev']);

        // Code is ready for editing - this transitions the editor from read-only mode
        setCodeReady(true);
      } catch (error) {
        console.error('Failed to initialize WebContainer:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initWebContainer();

    return () => {
      // Note: WebContainer teardown is problematic - known issue with the WebContainer API
      // https://github.com/stackblitz/webcontainer-core/issues/1125
      // instance?.teardown();
    };
  }, [template.files]);

  return (
    <WebContainerContext.Provider value={{ webContainer, template, isLoading, codeReady }}>
      {children}
    </WebContainerContext.Provider>
  );
}
```

### 3. Create Default Template for Projects

Define a standard template for our projects. Using a minimal, self-contained Vite + React template ensures fast initialization with modern development features:

```typescript
// app/templates/default.ts
import { FileSystemTree } from '@webcontainer/api';

export type Template = {
  files: FileSystemTree;
  entry: string;
  visibleFiles: string[];
};

export const DEFAULT_TEMPLATE: Template = {
  files: {
    'App.jsx': {
      file: {
        contents: `export default function App() {
  return <h1>Hello WebContainer!</h1>;
}`,
      },
    },
    'index.jsx': {
      file: {
        contents: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
      },
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WebContainer App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>`,
      },
    },
    'package.json': {
      file: {
        contents: `{
  "name": "webcontainer-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.9"
  }
}`,
      },
    },
    'vite.config.js': {
      file: {
        contents: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()]
});`,
      },
    },
  },
  entry: 'App.jsx',
  visibleFiles: ['App.jsx', 'index.jsx', 'index.html'],
};
```

> **Note**: Choosing Vite for the dev server is strategic - it offers the fastest HMR and minimal configuration compared to alternatives. This aligns with our "simplicity first" principle.

### 4. Implement the Code Editor Component

Create a Monaco-based editor that directly integrates with WebContainer. The key implementation detail is toggling `readOnly` mode based on `codeReady` state:

```typescript
// app/components/CodeEditor.tsx
import React from 'react';
import { Editor } from '@monaco-editor/react';
import { FileNode } from '@webcontainer/api';
import { useWebContainer } from '../providers/WebContainerProvider';

// Helper function to determine language from file extension
function getLanguageFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop() || '';
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
  };
  return map[extension] || 'plaintext';
}

// Simple file tabs component
function FileTabs({
  files,
  activeFile,
  onFileChange
}: {
  files: string[];
  activeFile: string;
  onFileChange: (file: string) => void;
}) {
  return (
    <div className="flex space-x-1 mb-2 border-b border-gray-200">
      {files.map(file => (
        <button
          key={file}
          onClick={() => onFileChange(file)}
          className={`px-3 py-1 ${
            activeFile === file
              ? 'bg-gray-200 font-medium'
              : 'hover:bg-gray-100'
          }`}
        >
          {file}
        </button>
      ))}
    </div>
  );
}

export default function CodeEditor() {
  const { template, webContainer, codeReady } = useWebContainer();
  const [activeFile, setActiveFile] = React.useState(template.entry);

  const currentFile = template.files[activeFile] as FileNode;
  const language = getLanguageFromFileName(activeFile);

  const handleCodeChange = async (value: string | undefined) => {
    if (!webContainer || !codeReady || !value) return;

    // Write changes directly to WebContainer filesystem
    // This triggers Vite's HMR to update the preview automatically
    await webContainer.fs.writeFile(activeFile, value);
  };

  return (
    <div className="h-full flex flex-col">
      <FileTabs
        files={template.visibleFiles}
        activeFile={activeFile}
        onFileChange={setActiveFile}
      />
      <div className="flex-1">
        <Editor
          theme="vs-dark"
          path={activeFile}
          defaultValue={currentFile.file.contents as string}
          defaultLanguage={language}
          onChange={handleCodeChange}
          options={{
            readOnly: !codeReady, // Critical for user experience - show code but prevent editing until ready
            minimap: { enabled: false }, // Improves performance by disabling the minimap
            scrollBeyondLastLine: false, // Better use of space
          }}
        />
      </div>
    </div>
  );
}
```

> **Performance Tip**: For larger files or more complex syntax highlighting, consider Monaco Editor's web worker approach for offloading language services. For our minimal implementation, this isn't necessary, but it's good to be aware of for future scaling.

### 5. Create the Preview Component

Build a simple iframe-based preview component that displays the output of the WebContainer dev server:

```typescript
// app/components/Preview.tsx
import React, { useRef, useEffect } from 'react';
import { useWebContainer } from '../providers/WebContainerProvider';

export default function Preview() {
  const { webContainer, isLoading, codeReady } = useWebContainer();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!webContainer || !iframeRef.current) return;

    // Listen for server-ready event from WebContainer
    // This happens when the Vite dev server is ready to serve content
    webContainer.on('server-ready', (port, url) => {
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    });
  }, [webContainer]);

  return (
    <div className="h-full flex flex-col">
      {isLoading && !codeReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
            <p>Setting up environment...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        src="about:blank"
        allow="cross-origin-isolated"
        title="Preview"
      />
    </div>
  );
}
```

> **Security Note**: The `allow="cross-origin-isolated"` attribute is important for ensuring the iframe can properly work with the isolated WebContainer environment. This, combined with the COOP/COEP headers, creates a secure sandbox.

### 6. Implement the Main Page Layout

Create a simple layout that integrates all components. The single-screen approach with a split layout ensures users can see both code and output simultaneously:

```typescript
// app/page.tsx
'use client';

import React from 'react';
import CodeEditor from './components/CodeEditor';
import Preview from './components/Preview';
import WebContainerProvider from './providers/WebContainerProvider';
import { DEFAULT_TEMPLATE } from './templates/default';

export default function Home() {
  return (
    <WebContainerProvider template={DEFAULT_TEMPLATE}>
      <div className="h-screen flex">
        <div className="w-1/2 h-full">
          <CodeEditor />
        </div>
        <div className="w-1/2 h-full">
          <Preview />
        </div>
      </div>
    </WebContainerProvider>
  );
}
```

> **UX Insight**: The simple 50/50 split layout eliminates cognitive load, helping users focus on the code-preview relationship. As supported by [Expo's editor implementation](https://blog.expo.dev/building-a-code-editor-with-monaco-f84b3a06deaf), the most important aspect of a code playground is immediate visual feedback.

### 7. Create a Loading HTML Page

Create a simple loading page to display in the iframe initially:

```html
<!-- public/loading.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Loading...</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        background-color: #f3f4f6;
      }
      .loader {
        border: 4px solid #e5e7eb;
        border-top: 4px solid #3b82f6;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <div style="text-align: center;">
      <div class="loader"></div>
      <p>Loading preview...</p>
    </div>
  </body>
</html>
```

## Final Target Architecture

Our architecture will be straightforward:

```
app/
├── components/
│   ├── CodeEditor.tsx       # Monaco editor with file tabs
│   └── Preview.tsx          # WebContainer server output display
├── providers/
│   └── WebContainerProvider.tsx  # WebContainer context and lifecycle
├── templates/
│   └── default.ts           # Default file templates
├── page.tsx                 # Main app component with layout
```

### Data Flow

1. **Initialization**:
   - WebContainerProvider boots WebContainer
   - Default template is mounted to virtual filesystem
   - Dependencies are installed
   - Dev server is started

2. **Editor Interaction**:
   - User edits code in Monaco editor
   - Changes are written to WebContainer filesystem
   - Vite dev server detects changes and hot-reloads

3. **Preview Updates**:
   - Preview iframe displays the output from Vite dev server
   - Changes are reflected in real-time

### Performance Considerations

- WebContainer initialization happens once on page load
- File changes are streamed directly to the filesystem
- Preview updates through HMR without full page refreshes
- Consider monitoring and limiting resource usage for complex user code
- Be aware that untrusted user code could cause performance issues in the browser tab

### Security Model

WebContainer provides a robust sandboxing model that eliminates traditional security concerns:

- No server-side code execution means no risk of server compromise
- Browser sandbox limits what code can access
- Cross-origin policies prevent data leakage
- All computation happens in the user's browser, reducing infrastructure concerns

### User Experience

- Initial state: Code is visible but read-only (streaming)
- After initialization: Code becomes editable
- Preview updates automatically as code changes
- Simple, focused interface with editor and preview side by side

## Conclusion

This implementation provides a streamlined development experience with:

1. Live code editing with Monaco Editor
2. Real-time preview with WebContainer's Node.js runtime
3. Minimal UI with just the essentials
4. Zero configuration for end users
5. No server-side compute requirements

By focusing only on what's necessary and eliminating options and complexity, we create a straightforward, performant coding environment that lets developers focus on their code rather than the tooling.

## Potential Future Enhancements (While Maintaining Minimalism)

While our focus is on simplicity, here are a few enhancements that could be considered if they align with the project's evolution:

1. **Performance Monitoring**: Add simple timers to monitor and report on WebContainer boot time and dependency installation.
2. **Error Handling**: Improve error feedback for common issues like syntax errors or package installation failures.
3. **Theming Support**: Add a simple dark/light theme toggle for improved accessibility and user preference.
4. **Optional AI Completion**: If desired, integrate with [AI completion services](https://spencerporter2.medium.com/building-copilot-on-the-web-f090ceb9b20b) for code suggestions, while keeping this as a toggleable feature.

These potential enhancements should only be pursued if they truly add value without compromising the clean, focused experience that is the core strength of this implementation.
