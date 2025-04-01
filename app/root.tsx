import { useEffect } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from 'react-router';
import type { MetaFunction } from 'react-router';

import type { Route } from './+types/root';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

// Define metadata for the app including Open Graph and Twitter cards
export const meta: MetaFunction = () => {
  return [
    // Basic metadata
    { title: 'Vibe Coding' },
    { name: 'description', content: 'The easiest AI App Builder' },

    // Open Graph tags
    { property: 'og:title', content: 'Vibe Coding' },
    { property: 'og:description', content: 'The easiest AI App Builder' },
    { property: 'og:image', content: 'https://vibe-coding.use-fireproof.com/card2.png' },
    { property: 'og:url', content: 'https://vibe-coding.use-fireproof.com' },
    { property: 'og:type', content: 'website' },

    // Twitter Card tags
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Vibe Coding' },
    { name: 'twitter:description', content: 'The easiest AI App Builder' },
    { name: 'twitter:image', content: 'https://vibe-coding.use-fireproof.com/card2.png' },
    { name: 'twitter:url', content: 'https://vibe-coding.use-fireproof.com' },
  ];
};

/**
 * Sets up theme detection based on system preferences
 */
function useThemeDetection() {
  useEffect(() => {
    // Console log for debugging in production
    console.log('Theme detection running');
    
    // Check if user has dark mode preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('Dark mode preference detected:', prefersDarkMode);

    // Additional iOS check - iOS might need extra detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    console.log('iOS device detected:', isIOS);

    // Apply initial theme
    if (prefersDarkMode) {
      document.documentElement.classList.add('dark');
      // Add a data attribute as an alternative hook for dark mode
      document.documentElement.dataset.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'light';
    }

    // Set up listener for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      console.log('Dark mode preference changed:', e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
        document.documentElement.dataset.theme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.dataset.theme = 'light';
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
}

export function Layout({ children }: { children: React.ReactNode }) {
  useThemeDetection();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
