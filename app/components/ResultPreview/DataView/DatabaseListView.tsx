import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DatabaseData from './DatabaseData';
import { fireproof } from 'use-fireproof';

// Component to find and display database names from app code
const DatabaseListView: React.FC<{ appCode: string; isDarkMode: boolean }> = ({
  appCode,
  isDarkMode,
}) => {
  // State for tracking refresh operations
  const [isRefreshing, setIsRefreshing] = useState(false);
  // State to store the active database instance
  const [dbInstance, setDbInstance] = useState<any>(null);
  // Key to force remount of components on refresh
  const [refreshKey, setRefreshKey] = useState(0);
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
  
  // Initialize or get database instance when databaseName changes
  useEffect(() => {
    if (!databaseName) return;
    
    const initDb = async () => {
      try {
        const db = fireproof(databaseName);
        await db.ready();
        setDbInstance(db);
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };
    
    initDb();
  }, [databaseName, refreshKey]);
  
  // Function to refresh the database by closing and reopening
  const refreshDatabase = useCallback(async () => {
    if (!databaseName || !dbInstance) return;
    
    setIsRefreshing(true);
    try {
      // Close current database instance
      await dbInstance.close();
      
      // Create a new database instance with the same name
      const newDb = fireproof(databaseName);
      await newDb.ready();
      setDbInstance(newDb);
      const allDocs = await newDb.allDocs();
      console.log('Database refreshed:', databaseName, allDocs.rows.length);
      // Update the refresh key to force remount
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing database:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [databaseName, dbInstance]);

  // Clean view with clear separation of concerns
  return (
    <div>
      {databaseName && (
        <div className="p-2">
          <h2 className="mb-2 text-lg font-medium">
            Data stored in <span className="font-mono">{databaseName}</span>
          </h2>
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-light-text-00 dark:text-dark-text-00">
              Database: <span className="font-mono">{databaseName}</span>
            </div>
            <button
              onClick={refreshDatabase}
              disabled={isRefreshing}
              className="px-3 py-1 bg-light-interactive-01 dark:bg-dark-interactive-01 hover:bg-light-interactive-02 dark:hover:bg-dark-interactive-02 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
          
          {dbInstance ? (
            <DatabaseData 
              dbName={dbInstance} 
              key={refreshKey} 
            />
          ) : (
            <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg p-4">
              <p>Initializing database connection to {databaseName}...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseListView;
