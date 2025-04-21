import { useNavigate, useParams, useLocation } from 'react-router-dom';
import SimpleAppLayout from '../components/SimpleAppLayout';
import VibesDIYLogo from '../components/VibesDIYLogo';
import Basic from '../components/vibespace/Basic';
import Wild from '../components/vibespace/Wild';
import ExplodingBrain from '../components/vibespace/ExplodingBrain';
import Cyberpunk from '../components/vibespace/Cyberpunk';
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

export function meta() {
  return [
    { title: 'Space Vibes - Vibes DIY' },
    { name: 'description', content: 'User space in Vibes DIY' },
  ];
}

export default function SpaceRoute(): ReactElement {
  const navigate = useNavigate();
  const { prefixUserId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const theme = searchParams.get('theme');
  const isWild = theme === 'wild';
  const isExplodingBrain = theme === 'exploding-brain';
  const isCyberpunk = theme === 'cyberpunk';

  // Check if the prefix is a tilde (~) and extract the userId
  // This handles our custom /~userId route pattern
  if (!prefixUserId || !prefixUserId.startsWith('~')) {
    // If this isn't a vibespace URL (doesn't start with ~), redirect to home
    navigate('/');
    return <div>Redirecting...</div>;
  }

  // Extract the actual userId after the tilde
  const userId = prefixUserId.substring(1);

  // Use Fireproof with the user-specific database
  const { useAllDocs } = useFireproof(`vu-${userId}`);

  // Query all documents in the database
  const allDocsResult = useAllDocs() as { docs: VibeDocument[] };
  const docs = allDocsResult.docs || [];
  const isLoading = !allDocsResult.docs; // If docs is undefined, it's still loading

  // Type the documents properly
  const vibes = docs.sort((b, a) => (a.createdAt || 0) - (b.createdAt || 0)) as VibeDocument[];

  // No need to log database contents

  // Handle clicking the remix button
  // Create URL for theme switching
  const createThemeUrl = (themeParam: string | null) => {
    const newSearchParams = new URLSearchParams(location.search);
    if (themeParam) {
      newSearchParams.set('theme', themeParam);
    } else {
      newSearchParams.delete('theme');
    }
    return `/${prefixUserId}?${newSearchParams.toString()}`;
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
