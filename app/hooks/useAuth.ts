import { useState, useEffect } from 'react';
import { parseToken, verifyToken } from '../utils/auth';

/**
 * Hook that provides authentication state and user information
 * @returns Authentication state and user information
 */
export function useAuth() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        // Get token from localStorage
        const token = localStorage.getItem('auth_token');

        // If we have a token and it's valid, use it
        if (token && (await verifyToken(token))) {
          const payload = parseToken(token);
          if (payload && payload.exp > Date.now() / 1000) {
            setUserId(payload.userId);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }

        // No valid token
        setUserId(undefined);
        setIsAuthenticated(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setUserId(undefined);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    userId,
    isAuthenticated,
    isLoading,
  };
}
