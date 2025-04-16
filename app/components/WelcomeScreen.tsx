import { memo } from 'react';
import VibesDIYLogo from './VibesDIYLogo';

// Welcome screen component shown when no messages are present
const WelcomeScreen = () => {
  return (
    <div className="text-accent-01 mx-auto max-w-2xl space-y-4 px-12 pt-8 text-center">
      <VibesDIYLogo className="mt-32" />
      <p className="pt-24 italic">Generate shareable apps in seconds.</p>
    </div>
  );
};

export default memo(WelcomeScreen);
