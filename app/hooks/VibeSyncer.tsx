import { useFireproof } from 'use-fireproof';
import { useSync } from './useSync';

export function VibeSyncer({ userId, vibes }: { userId?: string; vibes?: Array<{ id: string }> }) {
  if (!userId) throw new Error('No user ID provided');

  // Use the fireproof hook to get the database API and live query hooks
  const { useAllDocs } = useFireproof(`vibesync-${userId}`);

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
