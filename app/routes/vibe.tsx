import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

export function VibeIframeContainerComponent({ vibeSlug }: { vibeSlug: string }) {
  const iframeUrl = `https://${vibeSlug}.vibesdiy.app/${location.search}`;
  return (
    <iframe
      src={iframeUrl}
      title={`Vibe: ${vibeSlug}`}
      style={{ width: '100%', height: '100svh', border: 'none' }}
      allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; gamepad; geolocation; gyroscope; hid; microphone; midi; payment; picture-in-picture; publickey-credentials-get; screen-wake-lock; serial; usb; web-share; xr-spatial-tracking"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-orientation-lock allow-pointer-lock allow-downloads allow-top-navigation"
      allowFullScreen
    />
  );
}

export default function VibeIframeContainer() {
  const { vibeSlug } = useParams<{ vibeSlug: string }>();

  useEffect(() => {
    if (vibeSlug) {
      const redirectUrl = `https://${vibeSlug}.vibesdiy.app/${location.search}`;
      window.location.replace(redirectUrl);
    }
  }, [vibeSlug]);

  if (!vibeSlug) {
    return <div>No vibe slug provided</div>;
  }

  return <div>Redirecting...</div>;
}
