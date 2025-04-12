import React, { useEffect, useState } from 'react';
import DynamicTable from './DynamicTable';
import { headersForDocs } from './dynamicTableHelpers';
// Import Fireproof for database access
import { useFireproof } from 'use-fireproof';

// Component for displaying database data
const DatabaseData: React.FC<{ dbName: string; sessionId: string }> = ({ dbName, sessionId }) => {
  if (!dbName) {
    throw new Error('No valid database name provided');
  }

  const namespacedDbName = `vx-${sessionId}-${dbName}`;
  const [availableDbs, setAvailableDbs] = useState<string[]>([]);

  // Function to list all available databases
  const listAllDatabases = async () => {
    console.log('🔥 FIREPROOF DB INSPECTOR 🔥 Starting database inspection...', { dbName, namespacedDbName });
    try {
      // Check if the databases API is available
      if (typeof window.indexedDB.databases !== 'function') {
        console.warn('🔥 FIREPROOF DB INSPECTOR 🔥 indexedDB.databases() is not supported in this browser');
        setAvailableDbs(['API not supported in this browser']);
        return;
      }
      
      // Get all available databases
      const databases = await window.indexedDB.databases();
      // console.log('🔥 RAW DB LIST:', databases); // Log the raw response
      
      const dbNames = databases.map(db => db.name).filter(Boolean) as string[];
      setAvailableDbs(dbNames);
      
      // console.log('🔥 FIREPROOF DB INSPECTOR 🔥 Available databases:', dbNames);
      
      // Look for databases matching our patterns
      const originalDbMatches = dbNames.filter(name => name === dbName);
      const namespacedDbMatches = dbNames.filter(name => name === namespacedDbName);
      const sessionMatches = dbNames.filter(name => name?.includes(sessionId));
      
      // Filter the available databases list to only show those with the session ID
      // This makes it easier to focus on the databases relevant to the current session
      setAvailableDbs(sessionMatches);
      
      console.log(`🔥 DB MATCHES for '${dbName}':
        - Exact matches: ${originalDbMatches.length}
        - Namespaced matches: ${namespacedDbMatches.length}
        - Session ID matches: ${sessionMatches.length}`);
    } catch (err) {
      console.error('Error listing databases:', err);
      setAvailableDbs(['Error: ' + (err as Error).message]);
    }
  };

  // Enhanced debug logging  
  useEffect(() => {
    console.log('🔥 FIREPROOF DB inspection NAMESPACING 🔥 ' + dbName + ' → ' + namespacedDbName);
    
    // Immediate call for debugging
    listAllDatabases();
    
    // Also add a button to manually trigger it later if needed
    // Add a global refresh function for easier debugging via console
    (window as any)._refreshDbList = listAllDatabases;
  }, []);

  // Always use Fireproof with useLiveQuery for reactive data access
  const { useAllDocs, database } = useFireproof(namespacedDbName);

  // Always call hooks at the top level regardless of conditions
  // In Fireproof, useLiveQuery returns docs and potentially other properties
  const queryResult = useAllDocs();
  const docs = queryResult?.docs || [];

  const headers = docs.length > 0 ? headersForDocs(docs) : [];

  // Create a simple debug display component
  const DbDebugInfo = () => (
    <details className="mb-2 text-sm">
      <summary className="cursor-pointer text-blue-500 hover:text-blue-700">Database Inspection Details</summary>
      <div className="pl-2 mt-1 border-l-2 border-gray-300">
        <p><strong>Original DB Name:</strong> {dbName}</p>
        <p><strong>Session ID:</strong> {sessionId}</p>
        <p><strong>Namespaced DB Name:</strong> {namespacedDbName}</p>
        <p><strong>Current DB Name:</strong> {database.name}</p>
        <div className="mt-1">
          <p><strong>Session Databases ({availableDbs.length}):</strong></p>
          <button 
            onClick={() => listAllDatabases()} 
            className="text-xs bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2 mb-2"
          >
            Refresh DB List
          </button>
          <span className="text-xs text-gray-600">(Filtered by session ID: {sessionId})</span>
          <ul className="list-disc pl-4 mt-1">
            {availableDbs.map((name, idx) => (
              <li key={idx} className={name === namespacedDbName ? 'text-green-600 font-bold' : ''}>
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
      <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg p-4">
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
        onRowClick={(docId: string, dbName: string) => {
          console.log(`View document ${docId} from database ${database.name}`);
        }}
      />
    </div>
  );
};

export default DatabaseData;
