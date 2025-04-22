import React, { useEffect, useState } from 'react';
import { VibeCard } from './VibeCard';
import { loadVibeDocument, loadVibeScreenshot } from '../utils/vibeUtils';
import type { LocalVibe } from '../utils/vibeUtils';

interface VibeCardDataProps {
  vibeId: string;
  confirmDelete: string | null;
  onEditClick: (id: string, encodedTitle: string) => void;
  onToggleFavorite: (vibeId: string, e: React.MouseEvent) => Promise<void>;
  onDeleteClick: (vibeId: string, e: React.MouseEvent) => void;
  onRemixClick: (slug: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function VibeCardData({
  vibeId,
  confirmDelete,
  onEditClick,
  onToggleFavorite,
  onDeleteClick,
  onRemixClick,
}: VibeCardDataProps) {
  const [vibe, setVibe] = useState<LocalVibe | null>(null);
  const [screenshot, setScreenshot] = useState<
    { file: () => Promise<File>; type: string } | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);

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
      onEditClick={onEditClick}
      onToggleFavorite={onToggleFavorite}
      onDeleteClick={onDeleteClick}
      onRemixClick={onRemixClick}
    />
  );
}
