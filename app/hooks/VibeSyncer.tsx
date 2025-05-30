import { useFireproof, toCloud } from 'use-fireproof';
import { useSync } from './useSync';

export function VibeSyncer({ userId, vibes }: { userId?: string; vibes?: Array<{ id: string }> }) {
  if (!userId) throw new Error('No user ID provided');

  // Use the fireproof hook with cloud attachment configuration
  const { useAllDocs } = useFireproof(`vibesync-${userId}`, {
    attach: toCloud({
      dashboardURI: "http://localhost:3000/fp/cloud/api/token",
      tokenApiURI: "http://localhost:3000/api",
      urls: { base: "fpcloud://fireproof-v2-cloud-dev.jchris.workers.dev" },
      // tenant: "3rd-party",
      // ledger: "have-four-drinks",
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
