import React, { useMemo } from 'react';
import DatabaseData from './DatabaseData';

// Component to find and display database names from app code
const DatabaseListView: React.FC<{ appCode: string; isDarkMode: boolean }> = ({
  appCode,
  isDarkMode,
}) => {
  // Extract first 50 lines using memoization
  const firstFiftyLines = useMemo(() => {
    if (!appCode) return '';
    return appCode.split('\n').slice(0, 50).join('\n');
  }, [appCode]);

  // Extract database names from first 50 lines using memoization
  const databaseName = useMemo(() => {
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

  // Clean view with clear separation of concerns
  return (
    <div>
      <div className="mb-4">
        <h4 className="mb-2 text-lg font-medium">Detected Database</h4>
        <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg p-4">
          {!databaseName ? (
            <p>No database name found in the first 50 lines of code.</p>
          ) : (
            <div>
              <p className="mb-2">Database:</p>
              <div className="bg-light-decorative-01 dark:bg-dark-decorative-01 text-light-primary dark:text-dark-primary inline-block rounded-md px-3 py-1 font-mono text-sm">
                {databaseName}
              </div>
            </div>
          )}
        </div>
      </div>

      {databaseName && (
        <div className="mt-6">
          <h4 className="mb-2 text-lg font-medium">{databaseName} Documents</h4>
          <DatabaseData dbName={databaseName} key={databaseName} />
        </div>
      )}
    </div>
  );
};

export default DatabaseListView;
