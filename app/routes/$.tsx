import { Link } from 'react-router-dom';
import VibesDIYLogo from '../components/VibesDIYLogo';

export function meta() {
  return [
    { title: 'Page Not Found - Vibes DIY' },
    { name: 'description', content: 'The page you are looking for could not be found.' },
  ];
}

export default function NotFound() {
  return (
    <div className="bg-light-background dark:bg-dark-background flex min-h-screen flex-col items-center justify-center text-center">
      <div className="mb-8">
        <VibesDIYLogo height={80} />
      </div>
      
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-slate-800 dark:text-slate-200">404</h1>
        <p className="text-slate-600 dark:text-slate-400">Missing page</p>
      </div>

      <Link
        to="/"
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Home
      </Link>
    </div>
  );
}