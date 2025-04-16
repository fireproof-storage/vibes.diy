# Remix Implementation Plan

## Overview

The remix route will load code from an external vibecode.garden app, create a new session with that code, and redirect users to that session - all without requiring a chat exchange.

## Implementation Details

### 1. Create Remix Route

Create a new file at `/app/routes/remix.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../hooks/useSession';
import { encodeTitle } from '~/components/SessionSidebar/utils';
import { parseContent } from '../utils/segmentParser';

export function meta() {
  return [
    { title: 'Remix App - Vibes DIY' },
    { name: 'description', content: 'Remix an existing app with Vibes DIY' },
  ];
}

export default function Remix() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [appDomain, setAppDomain] = useState<string | null>(null);

  // Create a new session (we don't need a specific sessionId)
  const {
    session,
    sessionDatabase,
    updateTitle,
    submitUserMessage,
    mergeUserMessage,
    mergeAiMessage,
    submitAiMessage,
  } = useSession();

  // Effect to get referrer and fetch code
  useEffect(() => {
    async function processReferrer() {
      try {
        // Get referrer
        const referrer = document.referrer;

        // Extract domain from referrer
        const url = new URL(referrer);
        const domain = url.hostname;

        // Verify it's a vibecode.garden domain
        if (!domain.endsWith('vibecode.garden')) {
          setError('Invalid referrer - Only vibecode.garden apps can be remixed');
          setIsLoading(false);
          return;
        }

        // Extract app name from domain (subdomain)
        const appName = domain.split('.')[0];
        setAppDomain(appName);

        // Fetch the app code
        const appUrl = `https://${domain}/App.jsx`;
        const response = await fetch(appUrl);

        if (!response.ok) {
          throw new Error(`Error fetching app code: ${response.status}`);
        }

        const codeContent = await response.text();
        setSourceCode(codeContent);

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

        // Redirect to the new session
        navigate(`/chat/${session._id}/${encodeTitle(sessionTitle)}/code`, { replace: true });
      } catch (error) {
        console.error('Error in remix process:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    }

    // Run the process
    processReferrer();
  }, []);

  // Simple loading screen
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
```

### 2. Update Routes Config

Add the new route to `/app/routes.ts`:

```ts
// Existing imports...

export default [
  // Existing routes...
  route('remix', './routes/remix.tsx', { id: 'remix' }),
] satisfies RouteConfig;
```

### 3. Fallback Handling

If no valid referrer is found, the error handling in the component will show an error message with a button to go back to the home page.

### 4. Technical Notes

- **Direct Session Creation**: This approach bypasses the normal chat flow by creating both the user message and AI response in one go.
- **No Streaming**: Since we're creating a complete message immediately, there's no streaming involved.
- **Error Handling**: Proper error handling for:
  - Invalid referrers
  - Failed fetch requests
  - Missing App.jsx files

### 5. Advanced Features (Future)

Once basic functionality is in place, we could add:

- Better parsing of the app code to extract dependencies
- Customized initial AI message based on the app's features
- Option to select which parts of the app to remix
- Visual diff comparison between original and remixed versions
