import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleAppLayout from '../components/SimpleAppLayout';
import { HomeIcon } from '../components/SessionSidebar/HomeIcon';
import { ImgFile } from '../components/SessionSidebar/ImgFile';
import { useSession } from '../hooks/useSession';
import { useVibes } from '../hooks/useVibes';
import type { ReactElement } from 'react';

export function meta() {
  return [
    { title: 'My Vibes - Vibes DIY' },
    { name: 'description', content: 'Your created vibes in Vibes DIY' },
  ];
}

export default function MyVibesRoute(): ReactElement {
  const navigate = useNavigate();
  // We need to call useSession() to maintain context but don't need its values yet
  useSession();
  // Use our custom hook for vibes state management
  const { vibes, isLoading, deleteVibe } = useVibes();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Handle deleting a vibe
  const handleDeleteClick = async (vibeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (confirmDelete === vibeId) {
      try {
        // Immediately set confirmDelete to null to prevent accidental clicks
        setConfirmDelete(null);
        // Use the deleteVibe function from our custom hook
        // This will handle the optimistic UI update
        await deleteVibe(vibeId);
      } catch (error) {
        // Error handling is managed by the useVibes hook
      }
    } else {
      setConfirmDelete(vibeId);

      // Prevent the global click handler from immediately clearing the confirmation
      // by stopping the event from bubbling up to the document
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  // Clear confirmation when clicking elsewhere
  const handlePageClick = (e: MouseEvent) => {
    // Don't clear if the click originated from a delete button
    if (confirmDelete && !(e.target as Element).closest('button[data-action="delete"]')) {
      setConfirmDelete(null);
    }
  };

  // Add click handler to document to clear delete confirmation when clicking elsewhere
  React.useEffect(() => {
    // Use capture phase to handle document clicks before other handlers
    document.addEventListener('click', handlePageClick, true);
    return () => {
      document.removeEventListener('click', handlePageClick, true);
    };
  }, [confirmDelete]);

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
                  {vibe.screenshot && (
                    <ImgFile
                      file={vibe.screenshot}
                      alt={`Screenshot from ${vibe.title}`}
                      className="border-light-decorative-01 dark:border-dark-decorative-01 mt-3 mb-4 rounded-md border"
                    />
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteClick(vibe.id, e);
                      }}
                      data-action="delete"
                      data-vibe-id={vibe.id}
                      className={`${confirmDelete === vibe.id ? 'bg-red-500 text-white' : 'text-red-500'} rounded-md px-3 py-1 text-sm hover:bg-red-500 hover:text-white`}
                    >
                      {confirmDelete === vibe.id ? 'Are you Sure? No undo for this.' : 'Delete'}
                    </button>
                    <div className="flex-grow"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemixClick(vibe.slug, e);
                      }}
                      className="text-light-secondary dark:text-dark-secondary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded-md px-3 py-1 text-sm"
                    >
                      Remix
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleVibeClick(vibe.slug);
                      }}
                      className="text-light-primary bg-light-decorative-01 dark:text-dark-primary dark:bg-dark-decorative-01 rounded-md px-3 py-1 text-sm hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500"
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
