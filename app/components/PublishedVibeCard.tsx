import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

interface PublishedVibeCardProps {
  publishedUrl: string;
  name?: string;
}

export default function PublishedVibeCard({
  publishedUrl,
  name,
}: PublishedVibeCardProps): ReactElement {
  // Normalize the URL by removing trailing slash if present
  const normalizedUrl = publishedUrl.endsWith('/') ? publishedUrl.slice(0, -1) : publishedUrl;

  // Extract the slug from the URL (subdomain part)
  const urlParts = normalizedUrl.split('/');
  const domain = urlParts[2] || ''; // e.g., "example.vibecode.garden"
  const slug = domain.split('.')[0]; // e.g., "example"

  // Use provided name or extract from URL
  const vibeName = name || slug || 'Published Vibe';

  return (
    <div className="border-light-decorative-01 dark:border-dark-decorative-01 relative overflow-hidden rounded-md border transition-colors hover:border-blue-500">
      {/* Card links directly to remix URL */}
      <Link to={`/remix/${slug}`} className="block h-full w-full">
        <div className="p-2 py-1">
          <div className="flex h-8 items-center justify-between">
            <h3
              className="text-responsive truncate font-medium"
              style={{
                fontSize:
                  vibeName.length > 20
                    ? Math.max(0.8, 1 - (vibeName.length - 20) * 0.02) + 'rem'
                    : '1rem',
              }}
            >
              {vibeName}
            </h3>
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

          {/* Foreground image with fixed height */}
          <div className="relative z-10 flex h-48 w-full justify-center py-2">
            <img
              src={`${normalizedUrl}/screenshot.png`}
              alt={`Screenshot from ${vibeName}`}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
