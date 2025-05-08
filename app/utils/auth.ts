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

// Base58 alphabet for base58btc
const BASE58BTC_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Define JWK type
interface JWK {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
  ext?: boolean;
  key_ops?: string[];
}

/**
 * Decode a base58btc-encoded string to bytes
 * @param {string} str - The base58btc-encoded string
 * @returns {Uint8Array} - The decoded bytes
 */
function base58btcDecode(str: string): Uint8Array {
  // Remove the 'z' prefix for base58btc if present
  let input = str;
  if (input.startsWith('z')) {
    input = input.slice(1);
  }
  
  let num = BigInt(0);
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const value = BASE58BTC_ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid base58 character: ${char}`);
    num = num * BigInt(58) + BigInt(value);
  }
  
  // Convert to bytes
  const bytes = [];
  while (num > 0) {
    bytes.unshift(Number(num % BigInt(256)));
    num = num / BigInt(256);
  }
  
  // Account for leading zeros in the input
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '1') {
      bytes.unshift(0);
    } else {
      break;
    }
  }
  
  return new Uint8Array(bytes);
}

/**
 * Decode a base58btc-encoded JWK string to a public key JWK
 * @param {string} encodedString - The base58btc-encoded JWK string
 * @returns {JWK} - The decoded JWK public key
 */
function decodePublicKeyJWK(encodedString: string): JWK {
  // Decode the base58btc string
  const decoded = base58btcDecode(encodedString);
  
  // Try to parse as JSON
  try {
    const rawText = new TextDecoder().decode(decoded);
    return JSON.parse(rawText);
  } catch (error) {
    // If parsing fails, log the error and return a default JWK
    console.error('Failed to parse JWK from base58btc string:', error);
    
    return {
      kty: 'EC',
      crv: 'P-256',
      x: '',
      y: ''
    };
  }
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

  // // Check for redirect prevention flag to avoid redirect loops
  // if (sessionStorage.getItem('auth_redirect_prevention')) {
  //   return null;
  // }

  // // Save the current URL to redirect back after authentication
  // const returnUrl = window.location.pathname + window.location.search;
  // sessionStorage.setItem('auth_return_url', returnUrl);

  // // Set redirect prevention flag before redirecting
  // sessionStorage.setItem('auth_redirect_prevention', 'true');

  // Calculate the callback URL (absolute URL to our auth/callback route)
  const callbackUrl = new URL('/auth/callback', window.location.origin).toString();

  // Redirect to get a token, using our auth/callback route as the back_url
  const connectUrl = import.meta.env.VITE_CONNECT_URL || 'https://connect.fireproof.direct/fp/cloud/api/token';
  const authUrl = `${connectUrl}?back_url=${encodeURIComponent(callbackUrl)}`;
  return authUrl;
}

/**
 * Verify the token using jose library and return payload if valid.
 * This provides proper cryptographic verification of JWT tokens.
 * Returns the decoded payload if the token is valid and not expired, otherwise null.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // Base58btc-encoded public key (replace with actual key)
    const encodedPublicKey = import.meta.env.VITE_CLOUD_SESSION_TOKEN_PUBLIC
    
    // Decode the base58btc-encoded JWK
    const publicKey = decodePublicKeyJWK(encodedPublicKey);

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
    if (payload.exp  < Date.now()) {
      // Convert to milliseconds
      console.error('Token has expired');
      return null; // Token expired
    }

    // Cast to unknown first for type safety
    return payload as unknown as TokenPayload; // Verification successful, return payload
  } catch (error) {
    console.error('Error verifying or decoding token:', error);
    return null; // Verification failed
  }
}