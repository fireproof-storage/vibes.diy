import { useParams, Link } from 'react-router-dom';

export default function VibeIframeContainer() {
  const { vibeSlug } = useParams<{ vibeSlug: string }>();

  if (!vibeSlug) {
    return <div className="p-4">No vibe slug provided</div>;
  }

  const iframeUrl = `https://${vibeSlug}.vibecode.garden/`;

  // Format the slug for display by removing dashes and capitalizing words
  const formattedTitle = vibeSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="bg-light-background dark:bg-dark-background flex h-screen w-full flex-col">
      {/* Header */}
      <header className="border-light-border dark:border-dark-border flex h-[4rem] items-center justify-between border-b p-2 px-4 shadow-sm">
        <div className="flex items-center">
          <Link
            to="/"
            className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark mr-4 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-light-primary dark:text-dark-primary text-lg font-semibold">
            {formattedTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-light-decorative-00 dark:bg-dark-decorative-00 text-light-primary dark:text-dark-primary mr-2 rounded-md px-3 py-1 text-sm">
            Viewing Published Vibe
          </div>
          <Link
            to={`/remix/${vibeSlug}`}
            className="bg-accent-02-light dark:bg-accent-02-dark hover:bg-accent-03-light dark:hover:bg-accent-03-dark flex items-center justify-center space-x-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors"
            aria-label="Remix this vibe"
            title="Remix this vibe"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span>Remix</span>
          </Link>
        </div>
      </header>

      {/* Iframe */}
      <iframe
        src={iframeUrl}
        title={`Vibe: ${vibeSlug}`}
        className="h-full w-full flex-grow border-none"
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
        allowFullScreen
      />
    </div>
  );
}
