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
  favorite?: boolean;
  publishedUrl?: string;
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

        if (vibeDoc && vibeDoc._id === 'vibe') {
          // Get creation timestamp from vibeDoc or fallback to current time
          // Convert timestamp to ISO string for consistent formatting
          const createdTimestamp: string = vibeDoc.created_at
            ? new Date(vibeDoc.created_at).toISOString()
            : new Date('2025-02-02T15:17:00Z').toISOString();

          // Variable to store screenshot if found
          let screenshot: { file: () => Promise<File>; type: string } | undefined;

          try {
            // Query for the most recent screenshot document
            const result = await db.query('type', {
              key: 'screenshot',
              includeDocs: true,
              descending: true,
              limit: 1,
            });

            if (result.rows.length > 0) {
              const screenshotDoc = result.rows[0].doc as any;

              // Get the screenshot file if available
              if (screenshotDoc._files && screenshotDoc._files.screenshot) {
                screenshot = screenshotDoc._files.screenshot;
              }
            }
          } catch (error) {
            // Silently continue if screenshot can't be fetched
            // We already have the createdTimestamp from vibeDoc, no need to set it here
          }

          return {
            id: vibeId,
            title: vibeDoc.title || 'Unnamed Vibe',
            slug: vibeDoc.remixOf || vibeId, // Use remixOf as the slug
            created: createdTimestamp,
            favorite: vibeDoc.favorite || false,
            publishedUrl: vibeDoc.publishedUrl,
            screenshot: screenshot,
          };
        }
      } catch (error) {
        // Skip this vibe if we can't retrieve it
      }

      return null;
    });

    // Wait for all promises to resolve and filter out nulls
    const results = await Promise.all(vibePromises);
    // Filter out null values and cast to LocalVibe[] to satisfy TypeScript
    return results
      .filter((vibe) => vibe !== null)
      .sort((b, a) => new Date(a.created).getTime() - new Date(b.created).getTime()) as LocalVibe[];
  } catch (error) {
    // Return empty array if there's any error in the process
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
    await indexedDB.deleteDatabase(dbName);
  } catch (error) {
    throw error;
  }
}

/**
 * Toggle favorite status for a vibe
 * @param vibeId The ID of the vibe to toggle favorite status for
 * @param userId Optional user ID to update the user's vibe space database
 * @returns Promise that resolves to the updated vibe document
 */
export async function toggleVibeFavorite(vibeId: string, userId?: string): Promise<VibeDocument> {
  try {
    // Open the Fireproof database for this vibe
    const db = fireproof('vibe-' + vibeId);

    // Get the current vibe document
    const vibeDoc = (await db.get('vibe')) as VibeDocument;

    // Toggle the favorite status
    const updatedVibeDoc = {
      ...vibeDoc,
      favorite: !vibeDoc.favorite,
    };

    // Save the updated document
    await db.put(updatedVibeDoc);

    // If userId is provided AND the vibe has been published, update the user's space database
    if (userId && vibeDoc.publishedUrl) {
      try {
        // Get the user's vibe space database
        const userVibespaceDb = fireproof(`vu-${userId}`);

        // Extract the slug from the publishedUrl if available
        const slug = vibeDoc.publishedUrl.split('/').pop()?.split('.')[0] || '';

        // Try to get the existing document or create a new one
        // For consistency, use the same pattern as in publishUtils.ts
        const existingDoc = await userVibespaceDb.get(`app-${slug}`).catch(() => ({
          _id: `app-${slug}`,
        }));

        // Check if there's a screenshot
        let screenshot;
        try {
          // Query for the most recent screenshot document
          const result = await db.query('type', {
            key: 'screenshot',
            includeDocs: true,
            descending: true,
            limit: 1,
          });

          if (result.rows.length > 0) {
            const screenshotDoc = result.rows[0].doc as any;
            // Get the screenshot file if available
            if (screenshotDoc._files && screenshotDoc._files.screenshot) {
              screenshot = screenshotDoc._files.screenshot;
            }
          }
        } catch (screenshotError) {
          // Silently continue if screenshot can't be fetched
          console.error('Failed to fetch screenshot:', screenshotError);
        }

        // Update the document in the user's space database
        await userVibespaceDb.put({
          ...existingDoc,
          id: vibeId, // Preserve the original vibeId
          favorite: updatedVibeDoc.favorite,
          title: vibeDoc.title,
          slug: slug,
          remixOf: vibeDoc.remixOf, // Include remixOf field
          publishedUrl: vibeDoc.publishedUrl,
          createdAt: vibeDoc.created_at,
          lastUpdated: Date.now(),
          _files: screenshot ? { screenshot } : undefined,
        });

        console.log(`Updated published vibe ${vibeId} in user ${userId}'s space`, {
          favorite: updatedVibeDoc.favorite,
          slug: slug,
        });
      } catch (spaceError) {
        // Log error but don't fail the entire operation
        console.error('Failed to update user vibe space:', spaceError);
      }
    } else if (userId) {
      console.log(`Skipping update for unpublished vibe ${vibeId} in user ${userId}'s space`);
    }

    return updatedVibeDoc;
  } catch (error) {
    throw error;
  }
}
