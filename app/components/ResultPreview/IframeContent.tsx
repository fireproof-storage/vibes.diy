import React, { useEffect, useRef, useState } from 'react';
import type { IframeFiles } from './ResultPreviewTypes';
import { CALLAI_API_KEY } from '~/config/env';
import Editor from '@monaco-editor/react';
import { shikiToMonaco } from '@shikijs/monaco';
import { createHighlighter } from 'shiki';
import DynamicTable from './DynamicTable';
import { headersForDocs } from './dynamicTableHelpers';

// Import the iframe template using Vite's ?raw import option
import iframeTemplateRaw from './templates/iframe-template.html?raw';

interface IframeContentProps {
  activeView: 'preview' | 'code' | 'data';
  filesContent: IframeFiles;
  isStreaming: boolean;
  codeReady: boolean;
  sandpackKey: string;
  setActiveView: (view: 'preview' | 'code' | 'data') => void;
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
      <div
        style={{
          visibility: activeView === 'data' ? 'visible' : 'hidden',
          position: activeView === 'data' ? 'static' : 'absolute',
          zIndex: activeView === 'data' ? 1 : 0,
          height: '100%',
          width: '100%',
          top: 0,
          left: 0,
          padding: '16px',
          overflow: 'auto',
          backgroundColor: isDarkMode ? '#0d1117' : '#ffffff'
        }}
      >
        {!isStreaming && (
          <div className="data-container">
            <h3 className="text-xl font-medium mb-4">Database Information</h3>
            <DatabaseListView appCode={filesContent['/App.jsx']?.code || ''} isDarkMode={isDarkMode} />
          </div>
        )}
      </div>
    </div>
  );
};

// Component for displaying database data
const DatabaseData: React.FC<{ dbName: string }> = ({ dbName }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get data for a specific database
  useEffect(() => {
    // Skip for empty database name
    if (!dbName) {
      setData([]);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Direct IndexedDB access
        const request = indexedDB.open(dbName);
        
        request.onerror = (event) => {
          const error = `Error opening database: ${(event.target as any).error}`;
          console.error(error);
          setError(error);
          setLoading(false);
        };
        
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Get all object stores
          const objectStoreNames = Array.from(db.objectStoreNames);
          
          if (objectStoreNames.length === 0) {
            setData([]);
            setLoading(false);
            return;
          }
          
          // We'll focus on the 'docs' store which Fireproof uses
          const storeName = objectStoreNames.includes('docs') ? 'docs' : objectStoreNames[0];
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          
          const request = store.getAll();
          
          request.onsuccess = () => {
            const docs = request.result;
            setData(docs);
            setLoading(false);
          };
          
          request.onerror = (err) => {
            const errorMsg = `Error reading from database: ${err}`;
            console.error(errorMsg);
            setError(errorMsg);
            setLoading(false);
          };
        };
      } catch (err) {
        console.error('Database query error:', err);
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Cleanup function
    return () => {
      // No cleanup needed for IndexedDB
    };
  }, [dbName]);
  
  // Calculate headers for the current data
  const headers = data.length > 0 ? headersForDocs(data) : [];
  
  if (loading) {
    return (
      <div className="p-4 bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg">
        <p>Loading data from {dbName}...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg text-red-500">
        {error}
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="p-4 bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg">
        <p>No documents found in the database.</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-hidden rounded-lg border border-light-decorative-01 dark:border-dark-decorative-01">
      <DynamicTable 
        headers={headers}
        rows={data}
        dbName={dbName}
        hrefFn={() => '#'}
        onRowClick={(docId: string, dbName: string) => {
          console.log(`View document ${docId} from database ${dbName}`);
        }}
      />
    </div>
  );
};

// Component to find and display database names from app code
const DatabaseListView: React.FC<{ appCode: string; isDarkMode: boolean }> = ({ appCode, isDarkMode }) => {
  const [databaseNames, setDatabaseNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);

  // Extract database names from app code
  useEffect(() => {
    const extractDatabaseNames = (code: string): string[] => {
      const names: string[] = [];
      
      // Find useFireproof calls in the code
      // This regex looks for patterns like: useFireproof('name') or useFireproof("name") or useFireproof(`name`)
      const regex = /useFireproof\(\s*['"`]([^'"`)]*)['"`]\s*\)/g;
      let match;
      
      while ((match = regex.exec(code)) !== null) {
        if (match[1] && !names.includes(match[1])) {
          names.push(match[1]);
        }
      }

      // Also look for database names defined as variables
      const dbNameRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*['"`]([a-zA-Z0-9_-]+)['"`].*useFireproof\(\s*\1\s*\)/g;
      while ((match = dbNameRegex.exec(code)) !== null) {
        if (match[2] && !names.includes(match[2])) {
          names.push(match[2]);
        }
      }

      // Add session-based naming format - only add if it's a simple template
      // Don't add complex templates that can't be resolved in advance
      const sessionRegex = /useFireproof\(\s*`([^`]*\$\{[^}]*\}[^`]*)`\s*\)/g;
      while ((match = sessionRegex.exec(code)) !== null) {
        if (match[1] && !names.includes(match[1])) {
          if (match[1].includes('sessionId') || match[1].includes('session')) {
            // Add the template form but also try a real instantiation with a sample sessionId
            names.push(match[1] + ' (template)');
            // Try to guess a real database name by replacing sessionId with a sample value
            const sampleDbName = match[1].replace(/\$\{sessionId\}/g, 'current-session')
                                        .replace(/\$\{session.*?\}/g, 'current-session');
            if (!names.includes(sampleDbName)) {
              names.push(sampleDbName);
            }
          } else {
            names.push(match[1] + ' (template)');
          }
        }
      }

      // Try to find fireproof-chat-history DB by default as it's commonly used
      if (!names.includes('fireproof-chat-history')) {
        names.push('fireproof-chat-history');
      }

      return names;
    };

    if (appCode) {
      const names = extractDatabaseNames(appCode);
      setDatabaseNames(names.length > 0 ? names : []);
      
      // Set the first database as selected if there's at least one and none is currently selected
      if (names.length > 0 && !selectedDb) {
        // Find first non-template database
        const nonTemplateDb = names.find(name => !name.includes(' (template)'));
        setSelectedDb(nonTemplateDb || names[0]);
      }
    } else {
      setDatabaseNames([]);
    }
    
    setLoading(false);
  }, [appCode, selectedDb]);

  // Only handle extracting database names
  useEffect(() => {
    const extractDatabaseNames = (code: string): string[] => {
      const names: string[] = [];
      
      // Find useFireproof calls in the code
      const regex = /useFireproof\(\s*['"`]([^'"`)]*)['"`]\s*\)/g;
      let match;
      
      while ((match = regex.exec(code)) !== null) {
        if (match[1] && !names.includes(match[1])) {
          names.push(match[1]);
        }
      }

      // Also look for database names defined as variables
      const dbNameRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*['"`]([a-zA-Z0-9_-]+)['"`].*useFireproof\(\s*\1\s*\)/g;
      while ((match = dbNameRegex.exec(code)) !== null) {
        if (match[2] && !names.includes(match[2])) {
          names.push(match[2]);
        }
      }

      // Add session-based naming format as templates
      const sessionRegex = /useFireproof\(\s*`([^`]*\$\{[^}]*\}[^`]*)`\s*\)/g;
      while ((match = sessionRegex.exec(code)) !== null) {
        if (match[1] && !names.includes(match[1])) {
          names.push(match[1] + ' (template)');
          
          // Try to guess a real database name for session templates
          if (match[1].includes('sessionId') || match[1].includes('session')) {
            const sampleDbName = match[1].replace(/\$\{sessionId\}/g, 'current-session')
                                      .replace(/\$\{session.*?\}/g, 'current-session');
            if (!names.includes(sampleDbName)) {
              names.push(sampleDbName);
            }
          }
        }
      }

      // Try to find fireproof-chat-history DB by default
      if (!names.includes('fireproof-chat-history')) {
        names.push('fireproof-chat-history');
      }

      return names;
    };

    if (appCode) {
      const names = extractDatabaseNames(appCode);
      setDatabaseNames(names.length > 0 ? names : []);
      
      // Set the first database as selected if there's at least one
      if (names.length > 0 && !selectedDb) {
        // Find first non-template database
        const nonTemplateDb = names.find(name => !name.includes(' (template)'));
        setSelectedDb(nonTemplateDb || names[0]);
      }
    } else {
      setDatabaseNames([]);
    }
    
    setLoading(false);
  }, [appCode, selectedDb]);

  // Clean view with clear separation of concerns
  return (
    <div>
      <div className="mb-4">
        <h4 className="text-lg font-medium mb-2">Detected Databases</h4>
        {loading ? (
          <p>Scanning for database names...</p>
        ) : (
          <div className="p-4 bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg">
            {databaseNames.length === 0 ? (
              <p>No database names found in the app code.</p>
            ) : (
              <div>
                <p className="mb-2">Select a database to view:</p>
                <div className="flex flex-wrap gap-2">
                  {databaseNames.map((name, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedDb(name)}
                      className={`px-3 py-1 rounded-md font-mono text-sm ${selectedDb === name 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-light-decorative-01 dark:bg-dark-decorative-01 text-light-primary dark:text-dark-primary hover:bg-light-decorative-02 dark:hover:bg-dark-decorative-02'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedDb && (
        <div className="mt-6">
          <h4 className="text-lg font-medium mb-2">
            {selectedDb.replace(' (template)', '')} Documents
            {selectedDb.includes(' (template)') && (
              <span className="text-sm font-normal ml-2 text-light-decorative-04 dark:text-dark-decorative-04">
                (Template - can't query directly)
              </span>
            )}
          </h4>
          
          {selectedDb.includes(' (template)') ? (
            <div className="p-4 bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg">
              <p>This is a template database name with variables. Select a concrete database name to view its documents.</p>
            </div>
          ) : (
            // Pass the database name as a prop to a separate component
            <DatabaseData dbName={selectedDb} />
          )}
        </div>
      )}
    </div>
  );
};

export default IframeContent;
