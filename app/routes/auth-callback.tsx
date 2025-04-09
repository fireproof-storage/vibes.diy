import type { LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';

/**
 * Loader function that handles token processing and storage operations
 * This is more efficient than handling in useEffect
 */
export async function clientLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('fpToken');

  if (!token) {
    console.error('No token found in auth callback');
    return redirect('/');
  }

  try {
    // Store token in localStorage
    localStorage.setItem('auth_token', token);

    // Clear the redirect prevention flag
    sessionStorage.removeItem('auth_redirect_prevention');

    // Get the return URL and clear it
    const returnUrl = sessionStorage.getItem('auth_return_url') || '/';
    sessionStorage.removeItem('auth_return_url');

    // Redirect to the return URL
    return redirect(returnUrl);
  } catch (error) {
    console.error('Error processing token:', error);
    return redirect('/');
  }
}

/**
 * Auth callback component that shows loading state
 * All operations are handled in the loader
 */
export default function AuthCallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Processing authentication...</h1>
        <div className="mt-4">
          <div className="mx-auto h-2 w-24 animate-pulse rounded-full bg-blue-500" />
        </div>
      </div>
    </div>
  );
}
