import { memo } from 'react';
import VibesDIYLogo from './VibesDIYLogo';

// Welcome screen component shown when no messages are present
const WelcomeScreen = () => {
  return (
    <div className="text-accent-01 mx-auto flex max-w-2xl flex-col items-center space-y-4 px-12">
      <div className="flex w-full justify-center">
        <div className="hidden md:block">
          <VibesDIYLogo width={600} />
        </div>
        <div className="block md:hidden">
          <VibesDIYLogo width={300} />
        </div>
      </div>
      <p className="text-center italic">Generate shareable apps in seconds.</p>
    </div>
  );
};

export default memo(WelcomeScreen);
