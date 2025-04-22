import React from 'react';
import { StarIcon } from './SessionSidebar/StarIcon';
import { ImgFile } from './SessionSidebar/ImgFile';
import type { LocalVibe } from '../utils/vibeUtils';

interface VibeCardProps {
  vibe: LocalVibe;
  screenshot?: { file: () => Promise<File>; type: string };
  confirmDelete: string | null;
  onEditClick: (id: string, encodedTitle: string) => void;
  onToggleFavorite: (vibeId: string, e: React.MouseEvent) => Promise<void>;
  onDeleteClick: (vibeId: string, e: React.MouseEvent) => void;
  onRemixClick: (slug: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function VibeCard({
  vibe,
  screenshot,
  confirmDelete,
  onEditClick,
  onToggleFavorite,
  onDeleteClick,
  onRemixClick,
}: VibeCardProps) {
  return (
    <div
      key={vibe.id}
      className="border-light-decorative-01 dark:border-dark-decorative-01 cursor-pointer rounded-md border p-4 transition-colors hover:border-blue-500"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="mb-1 text-lg font-medium">{vibe.title}</h3>
          <div className="flex items-center space-x-2">
            {vibe.slug && vibe.slug !== vibe.id && (
              <a
                href={`https://${vibe.slug}.vibecode.garden`}
                className="text-xs text-gray-500 hover:text-gray-700"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`View remix source: ${vibe.slug}`}
              >
                🔀
              </a>
            )}
            {vibe.publishedUrl ? (
              <a
                href={vibe.publishedUrl}
                className="text-xs text-blue-500 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {vibe.publishedUrl && vibe.publishedUrl.split('/').pop()?.split('.')[0]}
              </a>
            ) : (
              <span className="text-accent-03 text-xs">Not published</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => onToggleFavorite(vibe.id, e)}
          className="text-accent-01 ml-2 hover:text-yellow-500 focus:outline-none"
          aria-label={vibe.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon filled={vibe.favorite} />
        </button>
      </div>
      <div
        onClick={() => onEditClick(vibe.id, vibe.encodedTitle)}
        className="mt-3 mb-4 cursor-pointer"
      >
        <div className="border-light-decorative-01 dark:border-dark-decorative-01 w-full overflow-hidden rounded-md border">
          {screenshot ? (
            <ImgFile
              file={screenshot}
              alt={`Screenshot from ${vibe.title}`}
              className="rounded-md"
              withBlurredBg={true}
              maxHeight="16rem"
            />
          ) : (
            <div
              className="flex h-40 w-full items-center justify-center bg-gray-200 dark:bg-gray-700"
              aria-label={`Placeholder for ${vibe.title}`}
            >
              <span className="text-sm text-gray-500 dark:text-gray-400">Click to edit</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={(e) => onDeleteClick(vibe.id, e)}
          data-action="delete"
          data-vibe-id={vibe.id}
          className={`${confirmDelete === vibe.id ? 'bg-red-500 text-white' : 'text-red-500'} rounded-md px-3 py-1 text-sm hover:bg-red-500 hover:text-white`}
        >
          {confirmDelete === vibe.id ? 'Are you Sure? No undo for this.' : 'Delete'}
        </button>
        <div className="flex-grow"></div>
        <button
          onClick={(e) => onRemixClick(vibe.slug, e)}
          className="text-light-secondary dark:text-dark-secondary hover:bg-light-decorative-01 dark:hover:bg-dark-decorative-01 rounded-md px-3 py-1 text-sm"
        >
          Remix
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onEditClick(vibe.id, vibe.encodedTitle);
          }}
          className="text-light-primary bg-light-decorative-01 dark:text-dark-primary dark:bg-dark-decorative-01 rounded-md px-3 py-1 text-sm hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
