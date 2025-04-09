/**
 * Authentication utilities for handling token-based auth
 */
import { importJWK, jwtVerify } from 'jose';

// Export the interface
export interface TokenPayload {
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
    console.log('Token found in URL, storing and returning');
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
    console.log('Token found in localStorage, verifying');
    // Verify the stored token is still valid
    const isValid = await verifyToken(storedToken);
    if (isValid) {
      console.log('Stored token is valid');
      return storedToken;
    }

    // Token is invalid or expired, remove it
    console.log('Stored token is invalid, removing');
    localStorage.removeItem('auth_token');
  }

  // At this point, we have no valid token but we DON'T auto-redirect
  // This allows the component to decide what to do
  return null;
}

/**
 * Initiate the authentication flow
 * This should be called when the user clicks the Connect button
 */
export function initiateAuthFlow(): void {
  // Don't redirect if we're already on the auth callback page
  if (window.location.pathname.includes('/auth/callback')) {
    console.log('Already on auth callback page');
    return;
  }

  // Check for redirect prevention flag to avoid redirect loops
  if (sessionStorage.getItem('auth_redirect_prevention')) {
    console.log('Preventing auth redirect loop - prevention flag is set');
    return;
  }

  // Save the current URL to redirect back after authentication
  const returnUrl = window.location.pathname + window.location.search;
  console.log('Saving return URL:', returnUrl);
  sessionStorage.setItem('auth_return_url', returnUrl);

  // Set redirect prevention flag before redirecting
  sessionStorage.setItem('auth_redirect_prevention', 'true');
  console.log('Setting redirect prevention flag');

  // Calculate the callback URL (absolute URL to our auth/callback route)
  const callbackUrl = new URL('/auth/callback', window.location.origin).toString();
  console.log('Calculated callback URL:', callbackUrl);

  // Redirect to get a token, using our auth/callback route as the back_url
  const authUrl = `https://dev.connect.fireproof.direct/fp/cloud/api/token?back_url=${encodeURIComponent(callbackUrl)}`;
  console.log('Redirecting to auth provider:', authUrl);
  window.location.href = authUrl;
}

/**
 * Parse and validate the JWT token
 */
export function parseToken(token: string): TokenPayload | null {
  try {
    // The token is in JWT format, but we'll just parse the payload part
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as TokenPayload;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}

/**
 * Verify the token using jose library
 * This provides proper cryptographic verification of JWT tokens
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    // In a development environment, return true to simplify testing
    // This should be replaced with proper verification in production
    if (import.meta.env.DEV || import.meta.env.VITE_SKIP_TOKEN_VERIFICATION) {
      return true;
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
    // Additional checks can be performed on the payload if needed
    if (!payload.exp || typeof payload.exp !== 'number') {
      console.error('Token missing expiration');
      return false;
    }

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      // Convert to milliseconds
      console.error('Token has expired');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;

  // Verify the token using jose library
  const isValid = await verifyToken(token);
  if (!isValid) return false;

  const payload = parseToken(token);
  if (!payload) return false;

  // Additional check for token expiration
  const now = Date.now() / 1000; // Convert to seconds to match JWT exp
  if (payload.exp < now) return false;

  return true;
}
