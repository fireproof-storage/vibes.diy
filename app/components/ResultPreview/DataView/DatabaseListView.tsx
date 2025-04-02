import React, { useMemo } from 'react';
import DatabaseData from './DatabaseData';
import { FIREPROOF_CHAT_HISTORY } from '../../../config/env';

// Component to find and display database content from app code
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

  // Determine database name - prioritize session database if available
  const databaseName = useMemo(() => {
    // First priority: use session database if available
    if (sessionId) {
      return `vibe-${sessionId}`;
    }

    // Second priority: extract from code
    if (firstFiftyLines) {
      // Find useFireproof calls in the code
      const regex = /useFireproof\(\s*['"`]([^'"`)]*)['"`]\s*\)/g;
      let match = regex.exec(firstFiftyLines);
      if (match?.[1]) return match[1];

      // Also look for database names defined as variables
      const dbNameRegex =
        /const\s+([a-zA-Z0-9_]+)\s*=\s*['"`]([a-zA-Z0-9_-]+)['"`].*useFireproof\(\s*\1\s*\)/g;
      match = dbNameRegex.exec(firstFiftyLines);
      if (match?.[2]) return match[2];
    }

    // Fallback to default database
    return FIREPROOF_CHAT_HISTORY;
  }, [firstFiftyLines, sessionId]);

  return (
    <div className="p-2">
      <h2 className="mb-2 text-lg font-medium">
        Data stored in <span className="font-mono">{databaseName}</span>
      </h2>
      <DatabaseData dbName={databaseName} key={databaseName} />
    </div>
  );
};

export default DatabaseListView;
