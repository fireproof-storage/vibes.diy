import {
  useFireproof,
  // toCloud
} from 'use-fireproof';
import { useEffect, useMemo } from 'react';
import type { LocalVibe } from '../utils/vibeUtils';

export function useSync(userId: string, vibes: Array<LocalVibe>) {
  if (!userId) throw new Error('No user ID provided');

  const { database, useAllDocs } = useFireproof(`vibesync-${userId}`, {
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

  useEffect(() => {
    if (!vibes || vibes.length === 0) return;

    console.log('syncing vibes', vibes.length, 'key:', vibeKey);

    const sync = async () => {
      // First, get all already synced vibe IDs
      const allDocsResult = await database.allDocs();
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

      // Sync only the unsynced vibes
      for (const vibe of unsyncedVibes) {
        const docId = `sync-${vibe.id}`;
        console.log('syncing new vibe', docId);
        await database.put({
          _id: docId,
          created: Date.now(),
          userId,
          vibeId: vibe.id,
          title: vibe.title,
          url: vibe.publishedUrl,
        });
      }

      if (unsyncedVibes.length > 0) {
        console.log('synced', unsyncedVibes.length, 'new vibes');
        // Log final state
        const finalResult = await database.allDocs();
        console.log('total synced vibes:', finalResult.rows.length);
      }
    };

    sync().catch((error) => {
      console.error('Sync failed:', error);
    });
  }, [userId, vibeKey, database]); // Use vibeKey instead of vibes array

  return { count };
}
