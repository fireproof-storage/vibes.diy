import { memo, useMemo } from 'react';
import VibesDIYLogo from './VibesDIYLogo';
import PublishedVibeCard from './PublishedVibeCard';

const publishedVibes = [
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
    url: 'https://global-kingfisher-4005.vibecode.garden'
  }
];

// Welcome screen component shown when no messages are present
const WelcomeScreen = () => {

const filteredVibes = useMemo(() => {
  // Get 3 random vibes from the publishedVibes array
  const shuffled = [...publishedVibes].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}, []);


  return (
    <div className="text-accent-01 mx-auto flex max-w-2xl flex-col items-center space-y-4 px-12">
      <div className="flex w-full justify-center">
        <div className="hidden md:block">
          <VibesDIYLogo width={300} />
        </div>
        <div className="block md:hidden">
          <VibesDIYLogo width={200} />
        </div>
      </div>
      <p className="text-center italic">Generate shareable apps in seconds.</p>
      
      <div className="mt-8 w-full max-w-md">
        {filteredVibes.map((vibe) => (
          <PublishedVibeCard 
            key={vibe.name} 
            publishedUrl={vibe.url} 
            name={vibe.name} 
          />
        ))}
      </div>
    </div>
  );
};

export default memo(WelcomeScreen);
