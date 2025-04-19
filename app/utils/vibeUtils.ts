// We define our own LocalVibe interface for the vibes list

/**
 * Lists all vibes stored locally
 * @returns Array of vibe objects with title, slug, id, and created fields
 */
export interface LocalVibe {
  id: string;
  title: string;
  slug: string;
  created: string;
}

export async function listLocalVibes(): Promise<LocalVibe[]> {
  // This is a placeholder function that returns example vibes
  // In a real implementation, this would fetch from the database
  return [
    {
      id: 'vibe-1',
      title: 'Modern Dashboard',
      slug: 'modern-dashboard',
      created: new Date('2025-04-10T15:30:00').toISOString(),
    },
    {
      id: 'vibe-2',
      title: 'Retro Gaming Interface',
      slug: 'retro-gaming-interface',
      created: new Date('2025-04-15T09:45:00').toISOString(),
    },
  ];
}
