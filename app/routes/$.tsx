import { Link } from 'react-router-dom';
import SimpleAppLayout from '../components/SimpleAppLayout';
import VibesDIYLogo from '../components/VibesDIYLogo';

export function meta() {
  return [
    { title: 'Page Not Found - Vibes DIY' },
    { name: 'description', content: 'The page you are looking for could not be found.' },
  ];
}

export default function NotFound() {
  return (
    <SimpleAppLayout
      headerLeft={
        <Link to="/" className="flex items-center space-x-2">
          <VibesDIYLogo height={32} />
          <span className="text-lg font-semibold">Vibes DIY</span>
        </Link>
      }
    >
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-8">
          <h1 className="mb-4 text-6xl font-bold text-slate-800 dark:text-slate-200">404</h1>
          <h2 className="mb-4 text-2xl font-semibold text-slate-700 dark:text-slate-300">
            Page Not Found
          </h2>
          <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">
            Sorry, the page you're looking for doesn't exist. It might have been moved, deleted, or
            you entered the wrong URL.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            to="/"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go Home
          </Link>
          <Link
            to="/vibes/mine"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            My Vibes
          </Link>
        </div>

        <div className="mt-12 text-sm text-slate-500 dark:text-slate-400">
          <p>
            Need help? Check out our{' '}
            <Link to="/about" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              About page
            </Link>{' '}
            or start building something amazing!
          </p>
        </div>
      </div>
    </SimpleAppLayout>
  );
}