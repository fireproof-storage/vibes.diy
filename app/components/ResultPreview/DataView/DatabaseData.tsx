import React from 'react';
import DynamicTable from './DynamicTable';
import { headersForDocs } from './dynamicTableHelpers';
// Import Fireproof for database access
import { useFireproof } from 'use-fireproof';

// Component for displaying database data
const DatabaseData: React.FC<{ dbName: string }> = ({ dbName }) => {
  if (!dbName) {
    throw new Error('No valid database name provided');
  }

  // Always use Fireproof with useLiveQuery for reactive data access
  const { useAllDocs, database } = useFireproof(dbName);

  // Always call hooks at the top level regardless of conditions
  // In Fireproof, useLiveQuery returns docs and potentially other properties
  const queryResult = useAllDocs();
  const docs = queryResult?.docs || [];

  const headers = docs.length > 0 ? headersForDocs(docs) : [];

  if (docs.length === 0) {
    return (
      <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg p-4">
        <p>Loading data from {dbName}...</p>
      </div>
    );
  }

  return (
    <div className="">
      <DynamicTable
        headers={headers}
        rows={docs}
        dbName={database.name}
        hrefFn={() => '#'}
        onRowClick={(docId: string, dbName: string) => {
          console.log(`View document ${docId} from database ${dbName}`);
        }}
      />
    </div>
  );
};

export default DatabaseData;
