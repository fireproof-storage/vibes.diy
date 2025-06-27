import { useLocation } from 'react-router-dom';
import SimpleAppLayout from './SimpleAppLayout';
import VibesDIYLogo from './VibesDIYLogo';
import Basic from './vibespace/Basic';
import Wild from './vibespace/Wild';
import ExplodingBrain from './vibespace/ExplodingBrain';
import Cyberpunk from './vibespace/Cyberpunk';
import type { ReactElement } from 'react';
import { useFireproof } from 'use-fireproof';

// Define the structure of our vibe documents
interface VibeDocument {
  _id: string;
  title?: string;
  slug?: string;
  createdAt?: number;
  publishedUrl?: string;
  _attachments?: {
    screenshot?: {
      data: Blob;
    };
  };
}

interface VibespaceComponentProps {
  tildeId?: string;
  atId?: string;
}

function StarfieldEmpty({ userId, prefix, userExists }: { userId: string; prefix: string; userExists: boolean }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
      {/* Starfield animation */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-80"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animation: `starMove ${Math.random() * 20 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Zooming effect overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `
          radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%),
          radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%)
        `,
          animation: 'zoom 8s ease-in-out infinite alternate',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <VibesDIYLogo height={60} />
        </div>

        <div className="space-y-6">
          <h1
            className="text-4xl font-bold text-white"
            style={{
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)',
              fontFamily: 'Impact, Arial Black, sans-serif',
              letterSpacing: '0.1em',
            }}
          >
            {userExists ? 'EMPTY SPACE' : 'SPACE'}
          </h1>
          <h2
            className="text-4xl font-bold text-white"
            style={{
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)',
              fontFamily: 'Impact, Arial Black, sans-serif',
              letterSpacing: '0.1em',
            }}
          >
            {userExists ? 'NO VIBES YET' : 'NOT FOUND'}
          </h2>
          <div
            className="mt-8 text-lg text-gray-300"
            style={{
              fontFamily: 'Courier New, monospace',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
            }}
          >
            {prefix}
            {userId}
          </div>
          {userExists && (
            <div
              className="mt-4 text-sm text-gray-400"
              style={{
                fontFamily: 'Courier New, monospace',
                textShadow: '0 0 5px rgba(255, 255, 255, 0.2)',
              }}
            >
              This user exists but hasn't created any vibes yet
            </div>
          )}
        </div>

        <div className="mt-12">
          <a
            href="/"
            className="text-lg tracking-wide text-gray-300 transition-all duration-300 hover:text-white"
            style={{
              fontFamily: 'Courier New, monospace',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
            }}
          >
            → HOME
          </a>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes starMove {
          0% {
            transform: translateZ(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateZ(1000px) scale(10);
            opacity: 0;
          }
        }

        @keyframes zoom {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

export default function VibespaceComponent({
  tildeId,
  atId,
}: VibespaceComponentProps): ReactElement {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const theme = searchParams.get('theme');
  const isWild = theme === 'wild';
  const isExplodingBrain = theme === 'exploding-brain';
  const isCyberpunk = theme === 'cyberpunk';

  // Determine the userId from either tildeId or atId
  const userId = tildeId || atId;
  const prefix = tildeId ? '~' : '@';

  if (!userId) {
    return <div>Invalid user space</div>;
  }

  // Use Fireproof with the user-specific database
  const { useAllDocs } = useFireproof(`vu-${userId}`);

  // Query all documents in the database
  const allDocsResult = useAllDocs() as { docs: VibeDocument[] };
  const docs = allDocsResult.docs || [];
  const isLoading = !allDocsResult.docs; // If docs is undefined, it's still loading

  // Type the documents properly
  const vibes = docs.sort((b, a) => (a.createdAt || 0) - (b.createdAt || 0)) as VibeDocument[];

  // Debug logging
  console.log('VibespaceComponent Debug:', {
    userId,
    dbName: `vu-${userId}`,
    docsLength: docs.length,
    vibesLength: vibes.length,
    isLoading,
    docs: docs.slice(0, 3) // First 3 docs for debugging
  });

  // If we have a userId from the path, assume the user exists
  // The database will be created when they first create a vibe
  const userExists = true;
  const hasVibes = vibes.length > 0;

  // If user has no vibes, show starfield
  if (!isLoading && !hasVibes) {
    return <StarfieldEmpty userId={userId} prefix={prefix} userExists={userExists} />;
  }

  // Create URL for theme switching
  const createThemeUrl = (themeParam: string | null) => {
    const newSearchParams = new URLSearchParams(location.search);
    if (themeParam) {
      newSearchParams.set('theme', themeParam);
    } else {
      newSearchParams.delete('theme');
    }
    return `/${prefix}${userId}?${newSearchParams.toString()}`;
  };

  return (
    <SimpleAppLayout
      headerLeft={
        <div className="flex w-full items-center justify-between">
          <a href="/" className="flex items-center px-2 py-1 hover:opacity-80" title="Home">
            <VibesDIYLogo width={100} className="pointer-events-none" />
          </a>
          <div className="mr-4 flex items-center space-x-2 text-sm">
            <span className="mr-1 text-gray-500">Theme:</span>
            <a
              href={createThemeUrl(null)}
              className={`rounded px-2 py-1 ${!theme ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}
            >
              Basic
            </a>
            <a
              href={createThemeUrl('wild')}
              className={`rounded px-2 py-1 ${isWild ? 'bg-green-100 text-green-800' : 'hover:bg-gray-100'}`}
            >
              Wild
            </a>
            <a
              href={createThemeUrl('exploding-brain')}
              className={`rounded px-2 py-1 ${isExplodingBrain ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-100'}`}
            >
              Brain
            </a>
            <a
              href={createThemeUrl('cyberpunk')}
              className={`rounded px-2 py-1 ${isCyberpunk ? 'bg-pink-100 text-pink-800' : 'hover:bg-gray-100'}`}
            >
              Cyberpunk
            </a>
          </div>
          <div className="items-right mr-4 flex space-x-2 text-sm italic">
            Profiles will be public at the end of the tech preview.
          </div>
        </div>
      }
    >
      {isExplodingBrain ? (
        <ExplodingBrain userId={userId} vibes={vibes} isLoading={isLoading} />
      ) : isWild ? (
        <Wild userId={userId} vibes={vibes} isLoading={isLoading} />
      ) : isCyberpunk ? (
        <Cyberpunk userId={userId} vibes={vibes} isLoading={isLoading} />
      ) : (
        <Basic userId={userId} vibes={vibes} isLoading={isLoading} />
      )}
    </SimpleAppLayout>
  );
}
