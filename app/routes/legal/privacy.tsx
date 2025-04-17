import SimpleAppLayout from '../../components/SimpleAppLayout';
import { HomeIcon } from '../../components/SessionSidebar/HomeIcon';
import VibesDIYLogo from '~/components/VibesDIYLogo';

export function meta() {
  return [
    { title: 'Privacy Policy - Vibes DIY' },
    { name: 'description', content: 'Privacy Policy for Vibes DIY' },
  ];
}

export default function Privacy() {
  return (
    <SimpleAppLayout
      headerLeft={
        <div className="flex items-center">
          <a
            href="/"
            className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark flex items-center px-3 py-2"
            aria-label="Go to home"
          >
            <HomeIcon className="h-6 w-6" />
          </a>
        </div>
      }
    >
      <div className="h-full">
        <div className="mw-10 flex items-center justify-center">
          <VibesDIYLogo width={300} />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="pb-4 text-2xl font-bold">Privacy Policy</h1>

          <div className="prose dark:prose-invert max-w-none">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </div>
        <p className="text-light-secondary dark:text-dark-secondary text-center text-xs">
          Copyright © 2025{' '}
          <a
            href="https://fireproof.storage"
            target="_blank"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Fireproof
          </a>
        </p>
      </div>
    </SimpleAppLayout>
  );
}
