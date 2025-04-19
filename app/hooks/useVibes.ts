import { useState, useEffect, useCallback } from 'react';
import { listLocalVibes, deleteVibeDatabase, type LocalVibe } from '../utils/vibeUtils';

/**
 * Custom hook for managing vibes state
 * Handles loading, deleting, and maintaining the state of vibes
 */
export function useVibes() {
  const [vibes, setVibes] = useState<LocalVibe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to load vibes
  const loadVibes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching vibes...');
      const localVibes = await listLocalVibes();
      console.log('Retrieved vibes:', localVibes);
      setVibes(localVibes);
    } catch (err) {
      console.error('Failed to load vibes:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to delete a vibe with optimistic UI update
  const deleteVibe = useCallback(
    async (vibeId: string) => {
      try {
        // Optimistically update UI by removing the vibe from state
        setVibes((currentVibes) => currentVibes.filter((vibe) => vibe.id !== vibeId));

        // Actually delete the vibe database
        console.log(`Deleting vibe database: ${vibeId}`);
        await deleteVibeDatabase(vibeId);
        console.log(`Successfully deleted vibe: ${vibeId}`);

        // We don't need to reload vibes since we've already updated the state optimistically
        // But if you want to ensure DB and state are in sync, you could uncomment this:
        // await loadVibes();
      } catch (err) {
        console.error(`Error deleting vibe ${vibeId}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));

        // If deletion fails, reload vibes to restore correct state
        await loadVibes();
      }
    },
    [loadVibes]
  );

  // Load vibes on mount
  useEffect(() => {
    loadVibes();
  }, [loadVibes]);

  return {
    vibes,
    isLoading,
    error,
    loadVibes,
    deleteVibe,
  };
}
