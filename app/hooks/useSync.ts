import { useFireproof, rt, toCloud } from 'use-fireproof';
import { useEffect } from 'react';
import type { LocalVibe } from '../utils/vibeUtils';

export function useSync(userId: string, vibes: Array<LocalVibe>) {
  if (!userId) throw new Error('No user ID provided');

  // Create a token strategy that retrieves the token from localStorage
  const getToken = () => {
    // Guard against SSR where localStorage isn't available
    if (typeof window === 'undefined' || !window.localStorage) return '';
    return localStorage.getItem('auth_token') || '';
  };

  const { database, useAllDocs } = useFireproof(`vibesync-${userId}`, {
    attach: toCloud({
      urls: { base: 'fpcloud://fireproof-v2-cloud-dev.jchris.workers.dev' },
      strategy: new rt.gw.cloud.SimpleTokenStrategy(getToken()),
      tenant: 'zGoxECs2hPjDM2bf4',
      ledger: 'z4mMTj7yRtstWBVNtg',
    }),
  });

  // Get real-time count of synced vibes
  const allDocsResult = useAllDocs() as {
    docs: Array<{ _id: string }>;
    rows?: Array<{ id: string }>;
  };
  const count = allDocsResult?.rows?.length || 0;

  useEffect(() => {
    if (!vibes || vibes.length === 0) return;
    const sync = async () => {
      for (const vibe of vibes) {
        const docId = `sync-${vibe.id}`;
        try {
          await database.get(docId);
        } catch {
          await database.put({
            _id: docId,
            created: Date.now(),
            userId,
            vibeId: vibe.id,
            title: vibe.title,
            url: vibe.publishedUrl,
          });
        }
      }
      database.allDocs().then((result) => {
        console.log('synced vibes', result);
      });
    };
    sync();
    // No cleanup needed
  }, [userId, vibes]);

  return { count };
}
