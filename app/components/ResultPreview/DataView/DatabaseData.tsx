import React from 'react';

// Component for displaying database data (isolated iframe mode)
const DatabaseData: React.FC<{ dbName: string; sessionId: string }> = ({ dbName, sessionId }) => {
  if (!dbName) {
    throw new Error('No valid database name provided');
  }

  return (
    <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 rounded-md p-4 text-sm">
      <h3 className="mb-2 font-medium">Isolated data view</h3>
      <p className="mb-2">
        The preview iframe runs in a sandbox without <code>allow-same-origin</code>, so its storage
        (IndexedDB, localStorage, cookies) is isolated from the host and resets on reload. The host
        app cannot directly inspect the iframes database.
      </p>
      <p className="mb-2">
        App code appears to use database <span className="font-mono">{dbName}</span> (session
        <span className="font-mono"> {sessionId}</span>).
      </p>
      <p className="text-xs text-gray-500">
        To debug data in this mode, expose it via your app UI or add a postMessage-based bridge in a
        future change.
      </p>
    </div>
  );
};

export default DatabaseData;
