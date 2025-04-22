import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VibeCard } from './VibeCard';
import { loadVibeDocument, loadVibeScreenshot } from '../utils/vibeUtils';
import type { LocalVibe } from '../utils/vibeUtils';
import { useVibes } from '../hooks/useVibes';

interface VibeCardDataProps {
  vibeId: string;
}

export function VibeCardData({ vibeId }: VibeCardDataProps) {
  const [vibe, setVibe] = useState<LocalVibe | null>(null);
  const [screenshot, setScreenshot] = useState<
    { file: () => Promise<File>; type: string } | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toggleFavorite, deleteVibe } = useVibes();

  // Navigation functions
  const handleEditClick = (id: string, encodedTitle: string) => {
    navigate(`/chat/${id}/${encodedTitle}/app`, { replace: true });
  };

  const handleRemixClick = (slug: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate(`/remix/${slug}`);
  };

  // Handle toggling the favorite status
  const handleToggleFavorite = async (vibeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await toggleFavorite(vibeId);
  };

  // Handle deleting a vibe
  const handleDeleteClick = async (vibeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (confirmDelete === vibeId) {
      try {
        // Immediately set confirmDelete to null to prevent accidental clicks
        setConfirmDelete(null);
        // Delete the vibe
        await deleteVibe(vibeId);
      } catch (error) {
        // Error handling is managed by the useVibes hook
      }
    } else {
      setConfirmDelete(vibeId);

      // Prevent the global click handler from immediately clearing the confirmation
      // by stopping the event from bubbling up
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  // Clear confirmation when clicking elsewhere
  useEffect(() => {
    const handlePageClick = (e: MouseEvent) => {
      // Don't clear if the click originated from a delete button
      if (confirmDelete && !(e.target as Element).closest('button[data-action="delete"]')) {
        setConfirmDelete(null);
      }
    };

    // Use capture phase to handle document clicks before other handlers
    document.addEventListener('click', handlePageClick, true);
    return () => {
      document.removeEventListener('click', handlePageClick, true);
    };
  }, [confirmDelete]);

  // Load the vibe document
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const vibeData = await loadVibeDocument(vibeId);
        if (isMounted) {
          setVibe(vibeData);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [vibeId]);

  // Load the screenshot separately
  useEffect(() => {
    let isMounted = true;

    const loadScreenshotData = async () => {
      try {
        const screenshotData = await loadVibeScreenshot(vibeId);
        if (isMounted) {
          setScreenshot(screenshotData);
        }
      } catch (error) {
        // Silently handle screenshot loading errors
        // The UI will just show the placeholder
      }
    };

    loadScreenshotData();

    return () => {
      isMounted = false;
    };
  }, [vibeId]);

  // Create a default/placeholder vibe with loading state if we're still loading
  // or if the vibe data failed to load
  const title = isLoading ? 'Loading...' : 'Vibe Not Found';
  const vibeData = vibe || {
    id: vibeId,
    title,
    encodedTitle: title.toLowerCase().replace(/ /g, '-'),
    slug: vibeId,
    created: new Date().toISOString(),
    favorite: false,
    publishedUrl: undefined,
  };

  return (
    <VibeCard
      vibe={vibeData}
      screenshot={screenshot}
      confirmDelete={confirmDelete}
      onEditClick={handleEditClick}
      onToggleFavorite={handleToggleFavorite}
      onDeleteClick={handleDeleteClick}
      onRemixClick={handleRemixClick}
    />
  );
}
