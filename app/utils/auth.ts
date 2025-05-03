/**
 * Authentication utilities for handling token-based auth
 */
import { importJWK, jwtVerify } from 'jose';

// Export the interface
export interface TokenPayload {
  email?: string; // Assuming email might be added or needed later
  userId: string;
  tenants: Array<{
    id: string;
    role: string;
  }>;
  ledgers: Array<{
    id: string;
    role: string;
    right: string;
  }>;
  iat: number;
  iss: string;
  aud: string;
  exp: number;
}

/**
 * Get the authentication token without automatically redirecting
 */
export async function getAuthToken(): Promise<string | null> {
  // Check URL for token parameter
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('fpToken');

  if (token) {
    // Store the token in localStorage for future use
    localStorage.setItem('auth_token', token);

    // Clean up the URL by removing the token parameter
    urlParams.delete('fpToken');
    const newUrl =
      window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
    window.history.replaceState({}, document.title, newUrl);

    // Reset redirect prevention flag since we got a valid token
    sessionStorage.removeItem('auth_redirect_prevention');

    return token;
  }

  // Check if we have a token in localStorage
  const storedToken = localStorage.getItem('auth_token');
  if (storedToken) {
    // Verify the stored token is still valid
    const isValid = await verifyToken(storedToken);
    if (isValid) {
      return storedToken;
    }

    // Token is invalid or expired, remove it
    localStorage.removeItem('auth_token');
  }

  // At this point, we have no valid token but we DON'T auto-redirect
  // This allows the component to decide what to do
  return null;
}

/**
 * Calculate the authentication URL for the flow
 * Returns the URL string or null if the flow should not be initiated.
 * This should be called when the user clicks the Connect button or needs to authenticate.
 */
export function initiateAuthFlow(): string | null {
  // Don't redirect if we're already on the auth callback page
  if (window.location.pathname.includes('/auth/callback')) {
    console.log('Already on auth callback page');
    return null;
  }

  // Check for redirect prevention flag to avoid redirect loops
  if (sessionStorage.getItem('auth_redirect_prevention')) {
    return null;
  }

  // Save the current URL to redirect back after authentication
  const returnUrl = window.location.pathname + window.location.search;
  sessionStorage.setItem('auth_return_url', returnUrl);

  // Set redirect prevention flag before redirecting
  sessionStorage.setItem('auth_redirect_prevention', 'true');

  // Calculate the callback URL (absolute URL to our auth/callback route)
  const callbackUrl = new URL('/auth/callback', window.location.origin).toString();

  // Redirect to get a token, using our auth/callback route as the back_url
  const authUrl = `https://connect.fireproof.direct/fp/cloud/api/token?back_url=${encodeURIComponent(callbackUrl)}`;
  return authUrl;
}

/**
 * Verify the token using jose library and return payload if valid.
 * This provides proper cryptographic verification of JWT tokens.
 * Returns the decoded payload if the token is valid and not expired, otherwise null.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // In a development environment, skip verification but still decode for payload
    if (import.meta.env.DEV || import.meta.env.VITE_SKIP_TOKEN_VERIFICATION) {
      console.warn('Skipping token verification in DEV mode.');
      // Basic decode for DEV mode (less secure than verify)
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Basic expiry check even in DEV
      if (!payload.exp || typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
        console.error('Token expired (DEV check)');
        return null;
      }
      // Cast to unknown first for type safety
      return payload as unknown as TokenPayload;
    }

    // JWK public key for ES256
    const publicKey = {
      kty: 'EC',
      crv: 'P-256',
      x: 'zeWndr5LEoaySgKSo2aZniYqXf5WxWq3WDGYvT4K4gg',
      y: 'qX2wWPXAc4TXhRFrQAGUgCwkAYHCTZNn8Yqz62DzFzs',
      ext: true,
      key_ops: ['verify'],
    };

    // Import the JWK
    const key = await importJWK(publicKey, 'ES256');

    // Verify the token
    const { payload } = await jwtVerify(token, key, {
      issuer: 'FP_CLOUD',
      audience: 'PUBLIC',
    });

    // If we got here, verification succeeded
    if (!payload.exp || typeof payload.exp !== 'number') {
      console.error('Token missing expiration');
      return null; // Missing expiration
    }

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      // Convert to milliseconds
      console.error('Token has expired');
      return null; // Token expired
    }

    // Add email parsing if needed, assuming it's within a nested object or custom claim
    // Example: const email = payload.user?.email or payload.email
    // For now, just ensure the basic structure matches TokenPayload

    // Cast to unknown first for type safety
    return payload as unknown as TokenPayload; // Verification successful, return payload
  } catch (error) {
    console.error('Error verifying or decoding token:', error);
    return null; // Verification failed
  }
}

/**
 * Check if the user is authenticated based on a valid, non-expired token.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = localStorage.getItem('auth_token'); // Check localStorage directly
  if (!token) return false;

  // Verify the token using the updated verifyToken function
  const payload = await verifyToken(token);

  // If payload is not null, the token is valid and not expired
  return payload !== null;
}
