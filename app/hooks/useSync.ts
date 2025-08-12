import {
  useFireproof,
  // toCloud
} from 'use-fireproof';
import { useEffect, useMemo, useRef } from 'react';
import type { LocalVibe } from '../utils/vibeUtils';

export function useSync(userId: string, vibes: Array<LocalVibe>) {
  if (!userId) throw new Error('No user ID provided');

  const dbName = `vibesync-${userId}`;
  console.log('useSync database name:', dbName);
  const { database, useAllDocs } = useFireproof(dbName, {
    // attach: toCloud(),
  });

  // Get real-time count of synced vibes
  const allDocsResult = useAllDocs() as {
    docs: Array<{ _id: string }>;
    rows?: Array<{ id: string }>;
  };
  const count = allDocsResult?.rows?.length || 0;

  // Create a stable key based on vibe IDs to prevent unnecessary re-syncing
  const vibeKey = useMemo(() => {
    return vibes
      .map((v) => v.id)
      .sort()
      .join(',');
  }, [vibes]);

  // Prevent double syncing in React StrictMode
  const syncInProgressRef = useRef(false);
  const lastSyncedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!vibes || vibes.length === 0) return;

    // Prevent double syncing in StrictMode
    if (syncInProgressRef.current || lastSyncedKeyRef.current === vibeKey) {
      console.log('Skipping sync - already in progress or already synced this key:', vibeKey);
      return;
    }

    console.log('syncing vibes', vibes.length, 'key:', vibeKey);
    syncInProgressRef.current = true;

    const sync = async () => {
      // Wait 200ms to allow database to be fully initialized after page load
      await new Promise((resolve) => setTimeout(resolve, 200));

      console.log('Starting sync for database:', dbName);
      console.log('Database object:', database);

      // First, get all already synced vibe IDs
      const allDocsResult = await database.allDocs({ includeDocs: true });
      console.log('allDocs length BEFORE sync:', allDocsResult.rows.length);
      console.log('ALL DOCUMENTS in database (with content):');
      allDocsResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Key: "${row.key}", Doc:`, JSON.stringify(row.value, null, 2));
      });
      console.log(
        'all doc keys:',
        allDocsResult.rows.map((row) => row.key)
      );

      const syncedVibeIds = new Set(
        allDocsResult.rows
          .map((row) => row.key)
          .filter((key) => key.startsWith('sync-'))
          .map((key) => key.replace('sync-', ''))
      );

      console.log('already synced vibe IDs:', Array.from(syncedVibeIds));

      // Filter to only sync unsynced vibes
      const unsyncedVibes = vibes.filter((vibe) => !syncedVibeIds.has(vibe.id));
      console.log('unsynced vibes to sync:', unsyncedVibes.length, 'out of', vibes.length);

      // Prepare documents for bulk insert
      const docsToSync = unsyncedVibes.map((vibe) => ({
        _id: `sync-${vibe.id}`,
        created: Date.now(),
        userId,
        vibeId: vibe.id,
        title: vibe.title,
        url: vibe.publishedUrl,
      }));

      // Bulk sync all unsynced vibes at once
      if (docsToSync.length > 0) {
        console.log('bulk syncing', docsToSync.length, 'new vibes');
        await database.bulk(docsToSync);
        console.log('synced', docsToSync.length, 'new vibes');
        // Log final state
        const finalResult = await database.allDocs({ includeDocs: true });
        console.log('allDocs length AFTER sync:', finalResult.rows.length);
        console.log('ALL DOCUMENTS after sync (with content):');
        finalResult.rows.forEach((row, index) => {
          console.log(
            `  ${index + 1}. Key: "${row.key}", Doc:`,
            JSON.stringify(row.value, null, 2)
          );
        });
        console.log(
          'final doc keys:',
          finalResult.rows.map((row) => row.key)
        );
      }

      // Mark this key as synced and reset in-progress flag
      lastSyncedKeyRef.current = vibeKey;
      syncInProgressRef.current = false;
    };

    sync().catch((error) => {
      console.error('Sync failed:', error);
      // Reset flags on error
      syncInProgressRef.current = false;
    });
  }, [userId, vibeKey, database]); // Use vibeKey instead of vibes array

  return { count };
}
