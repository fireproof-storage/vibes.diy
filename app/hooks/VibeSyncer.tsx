import { useFireproof, rt, toCloud } from 'use-fireproof';
import { useSync } from './useSync';

export function VibeSyncer({ userId, vibes }: { userId?: string; vibes?: Array<{ id: string }> }) {
  if (!userId) throw new Error('No user ID provided');

  const { useAllDocs } = useFireproof(`vibesync-${userId}`, {
    attach: toCloud({
      urls: { base: "fpcloud://fireproof-v2-cloud-dev.jchris.workers.dev" },
      strategy: new rt.gw.cloud.SimpleTokenStrategy('get-token-from-local-storage'),
      tenant: "zGoxECs2hPjDM2bf4",
      ledger: "z4mMTj7yRtstWBVNtg",
    }),
  });
  // Get real-time count of synced vibes
  const allDocsResult = useAllDocs() as {
    docs: Array<{ _id: string }>;
    rows?: Array<{ id: string }>;
  };
  const count = allDocsResult?.rows?.length || 0;

  // Use the sync hook to handle syncing logic
  useSync(userId, vibes || []);

  return (
    <span style={{ display: 'inline-block', marginBottom: 8, fontWeight: 500 }}>
      {count !== null ? `Syncing ${count} vibes` : '...'}
    </span>
  );
}
