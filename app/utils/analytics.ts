import ReactGA from 'react-ga4';
import { GA_TRACKING_ID } from '../config/analytics';

/**
 * Initialize Google Analytics
 */
export const initGA = (): void => {
  if (GA_TRACKING_ID) {
    ReactGA.initialize(GA_TRACKING_ID);
  }
};

/**
 * Track page view
 * @param path - The page path
 */
export const pageview = (path: string): void => {
  if (GA_TRACKING_ID) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
};

/**
 * Track custom event
 * @param category - Event category
 * @param action - Event action
 * @param label - Event label (optional)
 * @param value - Event value (optional)
 */
export const event = (category: string, action: string, label?: string, value?: number): void => {
  if (GA_TRACKING_ID) {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  }
};

/**
 * Track a Google Ads conversion event
 * @param eventName - Name of the event
 * @param eventParams - Optional parameters for the event
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>): void => {
  // Check if gtag is available (script exists and function is defined)
  if (typeof window === 'undefined') return;

  // Check if the script tag exists in the document
  const hasGTagScript = !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');

  // Check if the gtag function is defined
  const hasGTagFunction = typeof (window as any).gtag === 'function';

  // Only fire the event if both conditions are met (which implies consent was given)
  if (hasGTagScript && hasGTagFunction) {
    const gtag = (window as any).gtag as (...args: any[]) => void;
    gtag('event', eventName, eventParams);
  }
};

/**
 * Track auth button click
 * @param additionalParams - Optional additional parameters
 */
export const trackAuthClick = (additionalParams?: Record<string, any>): void => {
  trackEvent('auth', {
    send_to: GA_TRACKING_ID,
    ...additionalParams,
  });
};

/**
 * Track publish button click
 * @param additionalParams - Optional additional parameters
 */
export const trackPublishClick = (additionalParams?: Record<string, any>): void => {
  trackEvent('publish', {
    send_to: GA_TRACKING_ID,
    ...additionalParams,
  });
};

/**
 * Track ChatInput button click
 * @param messageLength - Length of the message being sent
 * @param additionalParams - Optional additional parameters
 */
export const trackChatInputClick = (
  messageLength: number,
  additionalParams?: Record<string, any>
): void => {
  trackEvent('chat', {
    send_to: GA_TRACKING_ID,
    message_length: messageLength,
    ...additionalParams,
  });
};

/**
 * Track error event
 * @param errorType - Type of the error
 * @param message - Error message
 * @param details - Optional additional details (object)
 */
export const trackErrorEvent = (
  errorType: string,
  message: string,
  details?: Record<string, any>
): void => {
  trackEvent('error', {
    send_to: GA_TRACKING_ID,
    error_type: errorType,
    error_message: message,
    ...details,
  });
};
