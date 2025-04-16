import { memo } from 'react';
import VibesDIYLogo from './VibesDIYLogo';

// Welcome screen component shown when no messages are present
const WelcomeScreen = () => {
  return (
    <div className="text-accent-01 mx-auto max-w-2xl space-y-4 px-12 text-center">
      <VibesDIYLogo 
        width={600}
      />
      <p className="italic">Generate shareable apps in seconds.</p>
    </div>
  );
};

export default memo(WelcomeScreen);
