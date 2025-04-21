import React, { useEffect, useState } from 'react';
import { VibeCard } from './VibeCard';
import { loadVibeDocument } from '../utils/vibeUtils';
import type { LocalVibe } from '../utils/vibeUtils';

interface VibeCardDataProps {
  vibeId: string;
  confirmDelete: string | null;
  onEditClick: (id: string) => void;
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
  const [isLoading, setIsLoading] = useState(true);

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

  // Create a default/placeholder vibe with loading state if we're still loading
  // or if the vibe data failed to load
  const vibeData = vibe || {
    id: vibeId,
    title: isLoading ? 'Loading...' : 'Vibe Not Found',
    slug: vibeId,
    created: new Date().toISOString(),
    favorite: false,
    publishedUrl: undefined,
  };

  return (
    <VibeCard
      vibe={vibeData}
      confirmDelete={confirmDelete}
      onEditClick={onEditClick}
      onToggleFavorite={onToggleFavorite}
      onDeleteClick={onDeleteClick}
      onRemixClick={onRemixClick}
    />
  );
}
