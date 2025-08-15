import { useFireproof } from 'use-fireproof';
import { useEffect, useMemo } from 'react';
import type { LocalVibe } from '../utils/vibeUtils';

// Module-level singleton flags for better catalog protection
let catalogInProgress = false;
let lastCatalogedKey: string | null = null;

export function useCatalog(userId: string, vibes: Array<LocalVibe>) {
  if (!userId) throw new Error('No user ID provided');

  const dbName = `vibe-catalog-${userId}`;
  const { database, useAllDocs } = useFireproof(dbName);

  // Get real-time count of cataloged vibes
  const allDocsResult = useAllDocs() as {
    docs: Array<{ _id: string }>;
    rows?: Array<{ id: string }>;
  };
  const count = allDocsResult?.rows?.length || 0;

  // Create a stable key based on vibe IDs to prevent unnecessary re-cataloging
  const vibeKey = useMemo(() => {
    return vibes
      .map((v) => v.id)
      .sort()
      .join(',');
  }, [vibes]);

  useEffect(() => {
    if (!vibes || vibes.length === 0) return;

    // Prevent double cataloging with module-level singleton behavior
    if (catalogInProgress || lastCatalogedKey === vibeKey) {
      return;
    }
    catalogInProgress = true;

    const catalog = async () => {
      // Wait 2000ms to allow database to be fully initialized after page load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`📋 Starting catalog - ${vibes.length} vibes from useVibes`);

      // Get all already cataloged vibe IDs using fireproof 0.23.0 API
      const allDocsResult = await database.allDocs({ includeDocs: true });
      
      console.log(`📋 Starting catalog - ${allDocsResult.rows.length} already cataloged in allDocs`);
      
      // Console a random doc from allDocs
      if (allDocsResult.rows.length > 0) {
        const randomDoc = allDocsResult.rows[Math.floor(Math.random() * allDocsResult.rows.length)];
        console.log('Random catalog doc:', randomDoc);
      }

      const catalogedVibeIds = new Set(
        allDocsResult.rows
          .map((row) => row.key)
          .filter((key) => key.startsWith('catalog-'))
          .map((key) => key.replace('catalog-', ''))
      );

      // Filter to only catalog uncataloged vibes
      const uncatalogedVibes = vibes.filter((vibe) => !catalogedVibeIds.has(vibe.id));
      
      // Console a random vibe from useVibes
      if (vibes.length > 0) {
        const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];
        console.log('Random vibe from useVibes:', randomVibe);
      }

      // Prepare documents for bulk insert
      const docsToCatalog = uncatalogedVibes.map((vibe) => ({
        _id: `catalog-${vibe.id}`,
        created: Date.now(),
        userId,
        vibeId: vibe.id,
        title: vibe.title,
        url: vibe.publishedUrl,
      }));

      // Bulk catalog all uncataloged vibes at once
      if (docsToCatalog.length > 0) {
        await database.bulk(docsToCatalog);
      }

      // Get final count after processing
      const finalDocsResult = await database.allDocs({ includeDocs: true });
      console.log(`📋 Finished catalog - ${finalDocsResult.rows.length} total cataloged in allDocs (added ${docsToCatalog.length})`);

      // Mark this key as cataloged and reset in-progress flag
      lastCatalogedKey = vibeKey;
      catalogInProgress = false;
    };

    catalog().catch((error) => {
      console.error('❌ Catalog failed:', error);
      // Reset flags on error
      catalogInProgress = false;
    });
  }, [userId, vibeKey, database]); // Use vibeKey instead of vibes array

  return { count };
}
