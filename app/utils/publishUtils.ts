/**
 * Utilities for publishing apps to the server
 */

import { normalizeComponentExports } from './normalizeComponentExports';

/**
 * Transform bare import statements to use esm.sh URLs
 * @param code The source code to transform
 * @returns Transformed code with proper import URLs
 */
function transformImports(code: string): string {
  // Convert bare imports to esm.sh URLs
  return code.replace(
    /import\s+(?:(?:{[^}]*})|(?:[^{}\s]*))?\s*(?:from\s+)?['"]([^./][^'"]*)['"];?/g,
    (match, packageName) => {
      // Only transform bare imports (packages without ./ or / prefix)
      if (packageName.startsWith('.') || packageName.startsWith('/')) {
        return match;
      }
      // Replace with esm.sh URL
      return match.replace(`"${packageName}"`, `"https://esm.sh/${packageName}"`);
    }
  );
}

/**
 * Publish an app to the server
 * @param params Parameters for publishing the app
 * @returns The published app URL if successful
 */
export async function publishApp({
  sessionId,
  code,
  updatePublishedUrl,
}: {
  sessionId?: string;
  code: string;
  updatePublishedUrl?: (url: string) => Promise<void>;
}): Promise<string | undefined> {
  try {
    if (!code || !sessionId) {
      console.error('Code or sessionId missing for publishing');
      return undefined;
    }

    // First, normalize the code to handle different line endings and whitespace
    const normalizedCode = code.replace(/\r\n/g, '\n').trim();

    // Transform imports to use esm.sh
    const transformedCode = transformImports(normalizeComponentExports(normalizedCode));

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

    const response = await fetch(`${API_BASE_URL}/api/apps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: sessionId,
        code: transformedCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.app?.slug) {
      const appUrl = `${API_BASE_URL.replace(/^https?:\/\//, 'http://')}`.endsWith('/')
        ? `http://${data.app.slug}.${API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}/`
        : `http://${data.app.slug}.${API_BASE_URL.replace(/^https?:\/\//, '')}/`;

      // Update the session with the published URL if callback provided
      if (updatePublishedUrl) {
        await updatePublishedUrl(appUrl);
      }

      console.log('App published successfully');
      return appUrl;
    }

    return undefined;
  } catch (error) {
    console.error('Error publishing app:', error);
    return undefined;
  }
}
