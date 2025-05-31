'use client';

import { ReactNode, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks/redux';

import { isTokenValid } from '@/lib/jwt';

import { checkAuth, setTokens } from '@/store/slices/authSlice';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken, user } = useAppSelector(state => state.auth);

  useEffect(() => {
    // Initialize auth state from localStorage or cookies
    const initializeAuth = async () => {
      // Get tokens from localStorage (fallback)
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      // If we don't have tokens in Redux but have them in localStorage
      if (!accessToken && storedAccessToken) {
        dispatch(
          setTokens({
            accessToken: storedAccessToken,
            refreshToken: storedRefreshToken,
          })
        );
      }

      // If we have a valid access token but no user, check auth
      if (storedAccessToken && isTokenValid(storedAccessToken) && !user) {
        try {
          await dispatch(checkAuth()).unwrap();
        } catch (error) {
          // Clear invalid tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    };

    initializeAuth();
  }, [dispatch, accessToken, user]);

  // Sync tokens with localStorage when they change
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [accessToken, refreshToken]);

  return <>{children}</>;
}
