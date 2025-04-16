import { memo } from 'react';
import VibesDIYLogo from './VibesDIYLogo';

// Welcome screen component shown when no messages are present
const WelcomeScreen = () => {
  return (
    <div className="text-accent-01 mx-auto max-w-2xl space-y-4 px-12 flex flex-col items-center">
      <div className="flex justify-center w-full">
        <div className="hidden md:block">
          <VibesDIYLogo width={600} />
        </div>
        <div className="block md:hidden">
          <VibesDIYLogo width={300} />
        </div>
      </div>
      <p className="italic text-center">Generate shareable apps in seconds.</p>
    </div>
  );
};

export default memo(WelcomeScreen);
