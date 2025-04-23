import { useMemo } from 'react';
import PublishedVibeCard from './PublishedVibeCard';

// Featured vibes data
export const publishedVibes = [
  {
    name: 'Reality Distortion Field',
    url: 'https://immense-shrimp-9469.vibecode.garden/',
  },
  {
    name: 'Quiz Game',
    url: 'https://miniature-mouse-6448.vibecode.garden/',
  },
  {
    name: '303 Synth',
    url: 'https://nice-peacock-7883.vibecode.garden/',
  },
  {
    name: 'Museum API',
    url: 'https://global-kingfisher-4005.vibecode.garden',
  },
  {
    name: 'Ascii Camera',
    url: 'https://physical-krill-5417.vibecode.garden',
  },
];

interface FeaturedVibesProps {
  count?: number;
  className?: string;
}

export default function FeaturedVibes({ count = 3, className = '' }: FeaturedVibesProps) {
  const filteredVibes = useMemo(() => {
    // Get random vibes from the publishedVibes array
    const shuffled = [...publishedVibes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [count]);

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-3 gap-4">
        {filteredVibes.map((vibe) => (
          <PublishedVibeCard key={vibe.name} publishedUrl={vibe.url} name={vibe.name} />
        ))}
      </div>
    </div>
  );
}
