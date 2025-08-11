import { useFireproof, 
  // toCloud
 } from 'use-fireproof';
import { useEffect } from 'react';
import type { LocalVibe } from '../utils/vibeUtils';

export function useSync(userId: string, vibes: Array<LocalVibe>) {
  if (!userId) throw new Error('No user ID provided');

  // Token strategy function (currently unused but kept for future cloud sync implementation)
  // const getToken = () => {
  //   // Guard against SSR where localStorage isn't available
  //   if (typeof window === 'undefined' || !window.localStorage) return '';
  //   const token = localStorage.getItem('auth_token') || '';
  //   console.log('gotToken from localStorage:', token);
  //   console.log('Token length:', token.length, 'parts:', token.split('.').length);
  //   if (token.split('.').length === 3) {
  //     try {
  //       const b64 = token.split('.')[1];
  //       const payload = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')));
  //       console.log('JWT payload:', payload);
  //       console.log(`exp: ${payload.exp}, iat: ${payload.iat}, created: ${payload.created}`);
  //       console.log('expires at:', new Date(payload.exp * 1000));
  //       // Calculate time until expiration
  //       const msLeft = payload.exp * 1000 - Date.now();
  //       const secLeft = Math.floor(msLeft / 1000);
  //       const minLeft = Math.floor(secLeft / 60);
  //       const secRemainder = secLeft % 60;
  //       console.log(`Token expires in ${minLeft} minute(s) and ${secRemainder} second(s)`);
  //     } catch (e) {
  //       console.warn('Failed to decode JWT payload:', e);
  //     }
  //   }
  //   return token;
  // };

  const { database, useAllDocs } = useFireproof(`vibesync-${userId}`, {
    // attach: toCloud({}),
  });

  // Get real-time count of synced vibes
  const allDocsResult = useAllDocs() as {
    docs: Array<{ _id: string }>;
    rows?: Array<{ id: string }>;
  };
  const count = allDocsResult?.rows?.length || 0;

  useEffect(() => {
    if (!vibes || vibes.length === 0) return;
    console.log('syncing vibes', vibes.length);
    const sync = async () => {
      for (const vibe of vibes) {
        const docId = `sync-${vibe.id}`;
        console.log('syncing vibe', docId, vibes.indexOf(vibe), vibes.length);
        try {
          await database.get(docId);
          console.log('vibe already synced', docId);
        } catch {
          console.log('vibe first sync', docId);
          await database.put({
            _id: docId,
            created: Date.now(),
            userId,
            vibeId: vibe.id,
            title: vibe.title,
            url: vibe.publishedUrl,
          });
        }
      }
      database.allDocs().then((result) => {
        console.log('saved vibes', result);
      });
    };
    sync();
    // No cleanup needed
  }, [userId, vibes]);

  return { count };
}
