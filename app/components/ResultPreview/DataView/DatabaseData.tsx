import React from 'react';
import DynamicTable from './DynamicTable';
import { headersForDocs } from './dynamicTableHelpers';
// Import Fireproof for database access
import { useFireproof } from 'use-fireproof';

// Component for displaying database data
const DatabaseData: React.FC<{ dbName: string }> = ({ dbName }) => {
  // Throw error if no valid database name is provided
  if (!dbName) {
    throw new Error('No valid database name provided');
  }
  
  // Always use Fireproof with useLiveQuery for reactive data access
  const { useLiveQuery } = useFireproof(dbName);
  
  // Always call hooks at the top level regardless of conditions
  // In Fireproof, useLiveQuery returns docs and potentially other properties
  const queryResult = useLiveQuery('_id');
  const docs = queryResult?.docs || [];

  console.log('Docs:', docs);

  const headers = docs.length > 0 ? headersForDocs(docs) : [];
  
  if (docs.length === 0) {
    return (
      <div className="p-4 bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-lg">
        <p>Loading data from {dbName}...</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-hidden rounded-lg border border-light-decorative-01 dark:border-dark-decorative-01">
      <DynamicTable 
        headers={headers}
        rows={docs}
        dbName={dbName}
        hrefFn={() => '#'}
        onRowClick={(docId: string, dbName: string) => {
          console.log(`View document ${docId} from database ${dbName}`);
        }}
      />
    </div>
  );
};

export default DatabaseData;
