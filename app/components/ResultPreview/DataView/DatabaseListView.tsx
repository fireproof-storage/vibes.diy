import React, { useEffect, useState } from 'react';
import DatabaseData from './DatabaseData';

// Component to find and display database names from app code
const DatabaseListView: React.FC<{ appCode: string; isDarkMode: boolean }> = ({
  appCode,
  isDarkMode,
}) => {
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
      const dbNameRegex =
        /const\s+([a-zA-Z0-9_]+)\s*=\s*['"`]([a-zA-Z0-9_-]+)['"`].*useFireproof\(\s*\1\s*\)/g;
      while ((match = dbNameRegex.exec(code)) !== null) {
        if (match[2] && !names.includes(match[2])) {
          names.push(match[2]);
        }
      }

      // We've removed the template database functionality

      // Try to find fireproof-chat-history DB by default
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
        setSelectedDb(names[0]);
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
        <h4 className="mb-2 text-lg font-medium">Detected Databases</h4>
        {loading ? (
          <p>Scanning for database names...</p>
        ) : (
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg p-4">
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
                      className={`rounded-md px-3 py-1 font-mono text-sm ${
                        selectedDb === name
                          ? 'bg-blue-600 text-white'
                          : 'bg-light-decorative-01 dark:bg-dark-decorative-01 text-light-primary dark:text-dark-primary hover:bg-light-decorative-02 dark:hover:bg-dark-decorative-02'
                      }`}
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
          <h4 className="mb-2 text-lg font-medium">{selectedDb} Documents</h4>

          {/* Pass the database name as a prop to the DatabaseData component */}
          <DatabaseData dbName={selectedDb} key={selectedDb}/>
        </div>
      )}
    </div>
  );
};

export default DatabaseListView;
