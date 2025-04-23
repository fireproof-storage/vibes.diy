import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

interface PublishedVibeCardProps {
  publishedUrl: string;
  name?: string;
}

export default function PublishedVibeCard({ publishedUrl, name }: PublishedVibeCardProps): ReactElement {
  // Normalize the URL by removing trailing slash if present
  const normalizedUrl = publishedUrl.endsWith('/') ? publishedUrl.slice(0, -1) : publishedUrl;
  
  // Extract the slug from the URL (subdomain part)
  const urlParts = normalizedUrl.split('/');
  const domain = urlParts[2] || ''; // e.g., "example.vibecode.garden"
  const slug = domain.split('.')[0]; // e.g., "example"
  
  // Use provided name or extract from URL
  const vibeName = name || slug || 'Published Vibe';

  return (
    <div className="relative border-light-decorative-01 dark:border-dark-decorative-01 rounded-md border overflow-hidden transition-colors hover:border-blue-500 mb-4">
      {/* Main card link */}
      <a
        href={publishedUrl}
        className="block w-full h-full"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{vibeName}</h3>
            <Link
              to={`/remix/${slug}`}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Remix
            </Link>
          </div>
        </div>
        
        <div className="relative w-full overflow-hidden">
          {/* Blurred background version */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={`${normalizedUrl}/screenshot.png`}
              className="h-full w-full scale-110 object-cover"
              alt=""
              style={{ filter: 'blur(10px)', opacity: 0.9 }}
              loading="lazy"
            />
          </div>

          {/* Foreground image with variable height */}
          <div className="relative z-10 flex w-full justify-center py-2">
            <img
              src={`${normalizedUrl}/screenshot.png`}
              alt={`Screenshot from ${vibeName}`}
              className="max-w-full object-contain"
              style={{ maxHeight: '16rem' }}
              loading="lazy"
            />
          </div>
        </div>
      </a>
      

    </div>
  );
}
