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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <Link to="/" className="mr-4 text-white hover:text-gray-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">{formattedTitle}</h1>
        </div>
        <div>
          <span className="text-sm bg-gray-700 px-3 py-1 rounded-full">
            Viewing Published Vibe
          </span>
        </div>
      </header>
      
      {/* Iframe */}
      <iframe 
        src={iframeUrl}
        title={`Vibe: ${vibeSlug}`}
        className="flex-grow w-full h-full border-none"
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
        allowFullScreen
      />
    </div>
  );
}
