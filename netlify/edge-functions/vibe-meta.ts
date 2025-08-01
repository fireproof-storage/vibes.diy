import { fetchVibeMetadata, generateMetaHTML } from './utils/meta-utils.ts';

const FIREHOSE_SLUG = 'satie-trumpet-8293';

export default async (request: Request) => {
  const url = new URL(request.url);
  let vibeSlug: string;

  // Check if this is a /vibe/* route
  const vibeMatch = url.pathname.match(/^\/vibe\/([^\/]+)$/);
  if (vibeMatch) {
    vibeSlug = vibeMatch[1];

    // Redirect /vibe/* routes to the vibe subdomain
    const searchParams = url.search;
    const redirectUrl = `https://${vibeSlug}.vibesdiy.app/${searchParams}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'no-cache',
      },
    });
  } else if (url.pathname === '/firehose') {
    vibeSlug = FIREHOSE_SLUG;
  } else {
    return; // Let other handlers deal with it
  }

  // Generate metadata HTML for firehose
  try {
    const searchParams = url.search;
    const metadata = await fetchVibeMetadata(vibeSlug, searchParams);

    // Override canonical URL for firehose route
    if (url.pathname === '/firehose') {
      metadata.canonicalUrl = 'https://vibes.diy/firehose';
    }

    const html = generateMetaHTML(metadata, searchParams);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching vibe metadata:', error);
    return; // Fall back to normal routing
  }
};

export const config = {
  path: ['/vibe/*', '/firehose'],
};
