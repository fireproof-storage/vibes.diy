import { fireproof } from 'use-fireproof';
import type { VibeDocument } from '../types/chat';

/**
 * Interface for vibe documents stored in the database
 */
export interface LocalVibe {
  id: string;
  title: string;
  slug: string;
  created: string;
  screenshot?: {
    file: () => Promise<File>;
    type: string;
  };
}

/**
 * Lists all vibes stored locally by querying IndexedDB for databases with names
 * starting with 'fp.vibe-' and retrieving the vibe document from each
 * @returns Array of vibe objects with title, slug, id, and created fields
 */
export async function listLocalVibes(): Promise<LocalVibe[]> {
  try {
    // Get all available IndexedDB databases
    const databases = await indexedDB.databases();

    // Filter for databases that start with 'fp.vibe-'
    const vibeDbs = databases.filter((db) => db.name && db.name.startsWith('fp.vibe-'));

    console.log('Found vibe databases:', vibeDbs);

    // Create an array of promises to fetch the vibe document from each database
    const vibePromises = vibeDbs.map(async (dbInfo) => {
      if (!dbInfo.name) return null;

      // Extract the vibe ID from the database name (remove 'fp.vibe-' prefix)
      const vibeId = dbInfo.name.replace('fp.vibe-', '');

      // Open the Fireproof database for this vibe
      const db = fireproof('vibe-' + vibeId);

      try {
        // Get the vibe document
        const vibeDoc = (await db.get('vibe')) as VibeDocument;
        console.log('Retrieved vibe document:', vibeDoc);

        if (vibeDoc && vibeDoc._id === 'vibe') {
          // Query for the most recent screenshot to get creation timestamp and screenshot
          let createdTimestamp: string;
          // Variable to store screenshot if found
          let screenshot: { file: () => Promise<File>; type: string } | undefined;

          try {
            // Query for the most recent screenshot document like in publishUtils.ts
            const result = await db.query('type', {
              key: 'screenshot',
              includeDocs: true,
              descending: true,
              limit: 1,
            });

            if (result.rows.length > 0) {
              const screenshotDoc = result.rows[0].doc as any;

              // Use the screenshot creation time or current time
              createdTimestamp = screenshotDoc.created_at
                ? new Date(screenshotDoc.created_at).toISOString()
                : new Date().toISOString();

              // Get the screenshot file if available
              if (screenshotDoc._files && screenshotDoc._files.screenshot) {
                screenshot = screenshotDoc._files.screenshot;
              }
            } else {
              createdTimestamp = new Date().toISOString();
            }
          } catch (error) {
            console.error('Error fetching screenshot:', error);
            createdTimestamp = new Date().toISOString();
          }

          return {
            id: vibeId,
            title: vibeDoc.title || 'Unnamed Vibe',
            slug: vibeDoc.remixOf || vibeId, // Use remixOf as the slug
            created: createdTimestamp,
            screenshot: screenshot,
          };
        }
      } catch (error) {
        console.error(`Error retrieving vibe from database ${dbInfo.name}:`, error);
      }

      return null;
    });

    // Wait for all promises to resolve and filter out nulls
    const results = await Promise.all(vibePromises);
    // Filter out null values and cast to LocalVibe[] to satisfy TypeScript
    return results.filter((vibe) => vibe !== null) as LocalVibe[];
  } catch (error) {
    console.error('Error listing local vibes:', error);
    return [];
  }
}

/**
 * Delete a vibe database by its ID
 * @param vibeId The ID of the vibe to delete
 * @returns Promise that resolves when the database is deleted
 */
export async function deleteVibeDatabase(vibeId: string): Promise<void> {
  try {
    const dbName = `fp.vibe-${vibeId}`;
    console.log(`Attempting to delete database: ${dbName}`);
    await indexedDB.deleteDatabase(dbName);
    console.log(`Successfully deleted database: ${dbName}`);
  } catch (error) {
    console.error(`Error deleting vibe database ${vibeId}:`, error);
    throw error;
  }
}
