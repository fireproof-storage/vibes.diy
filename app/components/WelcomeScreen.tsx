// Welcome screen component shown when no messages are present
import VibesDIYLogo from './VibesDIYLogo';

const WelcomeScreen = () => {
  return (
    <div className="text-accent-01 mx-auto max-w-2xl space-y-4 px-12 pt-8 text-center">
      <VibesDIYLogo className="scale-[3] font-bold text-[rgb(86,86,86)] sm:scale-[6] dark:text-[rgb(212,212,212)]" />
      <p className="pt-24 italic">Generate apps in seconds.</p>

      <p className="text-accent-02 mt-8 text-xs italic">
        Share your apps with the{' '}
        <a
          href="https://discord.gg/DbSXGqvxFc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-00 hover:underline"
        >
          Discord community
        </a>{' '}
        and fork the{' '}
        <a
          href="https://github.com/fireproof-storage/vibes.diy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-00 hover:underline"
        >
          builder repo
        </a>
        .
      </p>
    </div>
  );
};

export default WelcomeScreen;
