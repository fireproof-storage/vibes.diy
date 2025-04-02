import React, { useMemo, useState, useEffect } from 'react';
import DatabaseData from './DatabaseData';
import { FIREPROOF_CHAT_HISTORY } from '../../../config/env';

// Component to find and display database names from app code and session databases
const DatabaseListView: React.FC<{ appCode: string; isDarkMode: boolean; sessionId?: string }> = ({
  appCode,
  isDarkMode,
  sessionId,
}) => {
  // Extract first 50 lines using memoization
  const firstFiftyLines = useMemo(() => {
    if (!appCode) return '';
    return appCode.split('\n').slice(0, 50).join('\n');
  }, [appCode]);

  // State for managing database selection
  const [allDatabases, setAllDatabases] = useState<string[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<string | null>(null);

  // Extract database names from first 50 lines using memoization
  const extractedDatabaseName = useMemo(() => {
    if (!firstFiftyLines) return null;

    // Find useFireproof calls in the code
    const regex = /useFireproof\(\s*['"`]([^'"`)]*)['"`]\s*\)/g;
    let match = regex.exec(firstFiftyLines);
    if (match?.[1]) return match[1];

    // Also look for database names defined as variables
    const dbNameRegex =
      /const\s+([a-zA-Z0-9_]+)\s*=\s*['"`]([a-zA-Z0-9_-]+)['"`].*useFireproof\(\s*\1\s*\)/g;
    match = dbNameRegex.exec(firstFiftyLines);
    return match?.[2] || null;
  }, [firstFiftyLines]);

  // Get available databases including session-specific ones
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        // Get all indexedDB databases
        const dbNames: string[] = [];

        // Add main database
        dbNames.push(FIREPROOF_CHAT_HISTORY);

        // Add session-specific database if available
        if (sessionId) {
          dbNames.push(`vibe-${sessionId}`);
        }

        // Add extracted database from code if it exists and is different
        if (extractedDatabaseName && !dbNames.includes(extractedDatabaseName)) {
          dbNames.push(extractedDatabaseName);
        }

        setAllDatabases(dbNames);

        // Set active database (prioritize session database if available)
        if (sessionId && dbNames.includes(`vibe-${sessionId}`)) {
          setActiveDatabase(`vibe-${sessionId}`);
        } else if (extractedDatabaseName && dbNames.includes(extractedDatabaseName)) {
          setActiveDatabase(extractedDatabaseName);
        } else if (dbNames.length > 0) {
          setActiveDatabase(dbNames[0]);
        }
      } catch (error) {
        console.error('Error fetching database list:', error);
      }
    };

    fetchDatabases();
  }, [extractedDatabaseName, sessionId]);

  return (
    <div>
      {allDatabases.length > 0 && (
        <div className="p-2">
          <div className="mb-4">
            <h2 className="mb-2 text-lg font-medium">Available Databases</h2>
            <div className="flex flex-wrap gap-2">
              {allDatabases.map((dbName: string) => (
                <button
                  key={dbName}
                  className={`rounded-full px-3 py-1 text-sm ${
                    activeDatabase === dbName
                      ? 'bg-primary-500 text-white'
                      : 'bg-light-decorative-100 dark:bg-dark-decorative-100 hover:bg-light-decorative-200 dark:hover:bg-dark-decorative-200'
                  }`}
                  onClick={() => setActiveDatabase(dbName)}
                >
                  {dbName === FIREPROOF_CHAT_HISTORY
                    ? 'Main Database'
                    : dbName.startsWith('vibe-')
                      ? 'Session Data'
                      : dbName}
                </button>
              ))}
            </div>
          </div>

          {activeDatabase && (
            <div>
              <h3 className="text-md mb-2 font-medium">
                Data in <span className="font-mono">{activeDatabase}</span>
              </h3>
              <DatabaseData dbName={activeDatabase} key={activeDatabase} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseListView;
