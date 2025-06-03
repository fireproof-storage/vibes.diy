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
    // Send the token to the opener window
    if (window.opener) {
      window.opener.postMessage({ type: 'authSuccess', token }, window.location.origin);
      window.close(); // Close the popup
    } else {
      // Fallback or error handling if not opened as a popup
      console.error('Auth callback was not opened by a popup.');
      // Optionally redirect here as a fallback
      return redirect('/');
    }

    // No longer setting localStorage or redirecting here
    return null; // Indicate success without redirecting
  } catch (error) {
    console.error('Error processing token:', error);
    // Attempt to close even on error if possible, or redirect fallback
    if (window.opener) {
      window.close();
    }
    return redirect('/'); // Fallback redirect on error
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
