import { useEffect } from 'react';
import { useFireproof } from 'use-fireproof';

export function useSync(userId: string, vibes: Array<{ id: string }>) {
  if (!userId) throw new Error('No user ID provided');
  const { database } = useFireproof(`vibesync-${userId}`);

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
}
