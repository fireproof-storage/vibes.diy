// Utility functions for view state
import { CALLAI_API_KEY } from '~/config/env';
import type { ViewType } from './types';

// Helper to detect mobile viewport
export const isMobileViewport = () => {
  return typeof window !== 'undefined' && window.innerWidth < 768;
};

// Helper to extract view type from URL path
export const getViewFromPath = (pathname: string): ViewType => {
  if (pathname.endsWith('/app')) return 'preview';
  if (pathname.endsWith('/code')) return 'code';
  if (pathname.endsWith('/data')) return 'data';
  return 'preview'; // Default
};

// Helper to get iframe and send API key message
export const sendApiKeyToIframe = () => {
  const iframe = document.querySelector('iframe') as HTMLIFrameElement;
  iframe?.contentWindow?.postMessage({ type: 'callai-api-key', key: CALLAI_API_KEY }, '*');
};

// Helper to check if a path has an explicit view suffix
export const hasExplicitViewSuffix = (pathname: string) => {
  return pathname.endsWith('/code') || pathname.endsWith('/data');
};
