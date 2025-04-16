import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSession } from '../hooks/useSession';
import { encodeTitle } from '~/components/SessionSidebar/utils';

export function meta() {
  return [
    { title: 'Remix App - Vibes DIY' },
    { name: 'description', content: 'Remix an existing app with Vibes DIY' },
  ];
}

export default function Remix() {
  const navigate = useNavigate();
  const { vibeSlug } = useParams<{ vibeSlug?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appDomain, setAppDomain] = useState<string | null>(null);

  // Create a new session (we don't need a specific sessionId)
  const {
    session,
    updateTitle,
    submitUserMessage,
    mergeUserMessage,
    mergeAiMessage,
    submitAiMessage,
  } = useSession();

  // Effect to get vibe slug from path parameter and fetch code
  useEffect(() => {
    async function processVibeSlug() {
      try {
        // Check if we have a vibe slug in the URL path
        if (!vibeSlug) {
          setError('No vibe slug provided. Use /remix/your-app-slug');
          setIsLoading(false);
          return;
        }

        // Use the slug directly
        const appName = vibeSlug;
        setAppDomain(appName);

        // Fetch the app code
        const appUrl = `https://${appName}.vibecode.garden/App.jsx`;
        const response = await fetch(appUrl);

        if (!response.ok) {
          throw new Error(`Error fetching app code: ${response.status}`);
        }

        const codeContent = await response.text();

        // Create a new session with this code
        // First, set the session title
        const sessionTitle = `Remix of ${appName}`;
        await updateTitle(sessionTitle);

        // Create user message
        mergeUserMessage({
          text: `Please help me remix ${appName}.vibecode.garden`,
        });
        await submitUserMessage();

        // Create AI response with the code
        mergeAiMessage({
          text: `Certainly, here is the code:\n\n\`\`\`jsx\n${codeContent}\n\`\`\`\n\nPlease let me know what you'd like to change.`,
        });
        await submitAiMessage();

        console.log('Session created:', session);

        // Navigate to the chat session URL
        navigate(`/chat/${session._id}/${encodeTitle(sessionTitle)}`);
      } catch (error) {
        console.error('Error in remix process:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    }

    // Run the process
    processVibeSlug();
  }, []);

  // Loading or error screen
  return (
    <div className="flex h-screen w-full items-center justify-center">
      {isLoading ? (
        <div className="text-center">
          <div className="text-light-primary text-xl font-medium dark:text-white">
            {appDomain ? `Remixing ${appDomain}...` : 'Loading...'}
          </div>
          <div className="mt-4 h-2 w-40 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-full animate-pulse bg-blue-600"></div>
          </div>
        </div>
      ) : error ? (
        <div className="text-light-primary max-w-md rounded-md border border-red-300 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900 dark:text-white">
          <div className="text-lg font-medium text-red-700 dark:text-red-400">Error</div>
          <div className="mt-2">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      ) : null}
    </div>
  );
}
