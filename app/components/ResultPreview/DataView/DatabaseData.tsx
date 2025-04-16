import React, { useEffect, useState } from 'react';
import DynamicTable from './DynamicTable';
import { headersForDocs } from './dynamicTableHelpers';
// Import Fireproof for database access
import { useFireproof } from 'use-fireproof';
// Import the monkey patch utility
import { applyIndexedDBPatch } from './indexedDBMonkeyPatch';

// Component for displaying database data
const DatabaseData: React.FC<{ dbName: string; sessionId: string }> = ({ dbName, sessionId }) => {
  if (!dbName) {
    throw new Error('No valid database name provided');
  }

  const namespacedDbName = `vx-${sessionId}-${dbName}`;
  const [availableDbs, setAvailableDbs] = useState<string[]>([]);

  // Function to list available databases with the current session ID
  const listSessionDatabases = async () => {
    try {
      // Check if the databases API is available
      if (typeof window.indexedDB.databases !== 'function') {
        setAvailableDbs(['API not supported in this browser']);
        return;
      }

      // Get all available databases
      const databases = await window.indexedDB.databases();
      const dbNames = databases.map((db) => db.name).filter(Boolean) as string[];

      // Filter for databases with this session ID
      const sessionMatches = dbNames.filter((name) => name?.includes(sessionId));
      setAvailableDbs(sessionMatches);
    } catch (err) {
      console.error('Error listing databases:', err);
      setAvailableDbs(['Error: ' + (err as Error).message]);
    }
  };

  // Apply the IndexedDB monkey patch to ensure consistent namespacing with the iframe
  useEffect(() => {
    // Apply the patch as soon as the component mounts
    applyIndexedDBPatch(sessionId);

    // Load the initial database list
    listSessionDatabases();
  }, []);

  // With the IndexedDB patch, we should now be able to use the original dbName
  // and the patch will handle the namespacing at the IndexedDB.open level
  const { useAllDocs, database } = useFireproof(dbName);

  // Always call hooks at the top level regardless of conditions
  // In Fireproof, useLiveQuery returns docs and potentially other properties
  const queryResult = useAllDocs();
  const docs = queryResult?.docs || [];

  const headers = docs.length > 0 ? headersForDocs(docs) : [];

  // Create a simple debug display component
  const DbDebugInfo = () => (
    <details className="mb-2 text-sm">
      <summary className="cursor-pointer text-blue-500 hover:text-blue-700">
        Database Inspection Details
      </summary>
      <div className="border-light-decorative-01 mt-1 border-l-2 pl-2">
        <p>
          <strong>Original DB Name:</strong> {dbName}
        </p>
        <p>
          <strong>Session ID:</strong> {sessionId}
        </p>
        <p>
          <strong>Namespaced DB Name:</strong> {namespacedDbName}
        </p>
        <p>
          <strong>Current DB Name:</strong> {database.name}
        </p>
        <div className="mt-1">
          <p>
            <strong>Session Databases ({availableDbs.length}):</strong>
          </p>
          <button
            onClick={() => listSessionDatabases()}
            className="mr-2 mb-2 rounded-sm bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-700"
          >
            Refresh DB List
          </button>
          <span className="text-accent-02 text-xs">(Filtered by session ID: {sessionId})</span>
          <ul className="mt-1 list-disc pl-4">
            {availableDbs.map((name, idx) => (
              <li key={idx} className={name === namespacedDbName ? 'font-bold text-green-600' : ''}>
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );

  if (docs.length === 0) {
    return (
      <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-md p-4">
        <DbDebugInfo />
        <p>Loading data from {database.name}...</p>
      </div>
    );
  }

  return (
    <div className="">
      <DbDebugInfo />
      <DynamicTable
        headers={headers}
        rows={docs}
        dbName={database.name}
        hrefFn={() => '#'}
        onRowClick={(docId: string) => {
          console.log(`View document ${docId} from database ${database.name}`);
        }}
      />
    </div>
  );
};

export default DatabaseData;
