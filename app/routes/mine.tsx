import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleAppLayout from '../components/SimpleAppLayout';
import { HomeIcon } from '../components/SessionSidebar/HomeIcon';
import { useSession } from '../hooks/useSession';
import { listLocalVibes, type LocalVibe } from '../utils/vibeUtils';
import type { ReactElement } from 'react';

export function meta() {
  return [
    { title: 'My Vibes - Vibes DIY' },
    { name: 'description', content: 'Your created vibes in Vibes DIY' },
  ];
}

export default function MyVibes(): ReactElement {
  const navigate = useNavigate();
  // We're including the session hook for potential future use
  const { mainDatabase: _ } = useSession();
  const [vibes, setVibes] = useState<LocalVibe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVibes() {
      try {
        const localVibes = await listLocalVibes();
        setVibes(localVibes);
      } catch (error) {
        console.error('Failed to load vibes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadVibes();
  }, []);

  const handleVibeClick = (slug: string) => {
    navigate(`/vibe/${slug}`);
  };

  const handleRemixClick = (slug: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate(`/remix/${slug}`);
  };

  return (
    <SimpleAppLayout
      headerLeft={
        <div className="flex items-center">
          <a href="/" className="flex items-center px-2 py-1 hover:opacity-80" title="Home">
            <HomeIcon className="mr-2 h-6 w-6" />
            <h1 className="text-xl font-semibold">Vibes DIY</h1>
          </a>
        </div>
      }
    >
      {/* Content goes here */}
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h2 className="mb-4 text-2xl font-bold">My Vibes</h2>
          <p className="text-accent-01 dark:text-accent-01 mb-6">
            View and manage the vibes you've created
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : vibes.length === 0 ? (
            <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded-md border py-8 text-center">
              <p className="mb-4 text-lg">You don't have any vibes yet</p>
              <button
                onClick={() => navigate('/remix')}
                className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                Create a Vibe
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vibes.map((vibe) => (
                <div
                  key={vibe.id}
                  onClick={() => handleVibeClick(vibe.slug)}
                  className="border-light-decorative-01 dark:border-dark-decorative-01 cursor-pointer rounded-md border p-4 transition-colors hover:border-blue-500"
                >
                  <h3 className="mb-1 text-lg font-medium">{vibe.title}</h3>
                  <p className="text-light-secondary dark:text-dark-secondary mb-3 text-sm">
                    Created: {new Date(vibe.created).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleRemixClick(vibe.slug, e)}
                      className="rounded-md bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                    >
                      Remix
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vibe/${vibe.slug}`);
                      }}
                      className="bg-light-background-01 text-light-primary hover:bg-light-background-02 dark:bg-dark-decorative-00 dark:text-dark-secondary dark:hover:bg-dark-decorative-01 rounded-md px-3 py-1 text-sm transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SimpleAppLayout>
  );
}
