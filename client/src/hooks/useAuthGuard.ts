import { useRouter } from 'next/navigation';

import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks/redux';

import { isTokenValid } from '@/lib/jwt';

import { checkAuth, clearAuth, refreshTokens } from '@/store/slices/authSlice';

export const useAuthGuard = (requireAuth: boolean = true) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, accessToken, refreshToken, loading } = useAppSelector(state => state.auth);

  useEffect(() => {
    const validateAuth = async () => {
      // If we don't require auth, skip validation
      if (!requireAuth) return;

      // If we have a valid access token and user, we're good
      if (accessToken && isTokenValid(accessToken) && user) {
        return;
      }

      // If we have a refresh token but no valid access token, try to refresh
      if (refreshToken && (!accessToken || !isTokenValid(accessToken))) {
        try {
          await dispatch(refreshTokens()).unwrap();
          // After successful refresh, check auth status
          await dispatch(checkAuth()).unwrap();
          return;
        } catch (error) {
          // Refresh failed, clear auth and redirect
          dispatch(clearAuth());
          router.push('/login');
          return;
        }
      }

      // If we have an access token but no user, check auth status
      if (accessToken && isTokenValid(accessToken) && !user) {
        try {
          await dispatch(checkAuth()).unwrap();
          return;
        } catch (error) {
          // Auth check failed, clear auth and redirect
          dispatch(clearAuth());
          router.push('/login');
          return;
        }
      }

      // No valid authentication, redirect to login
      if (requireAuth) {
        dispatch(clearAuth());
        router.push('/login');
      }
    };

    validateAuth();
  }, [accessToken, refreshToken, user, requireAuth, dispatch, router]);

  return {
    user,
    isAuthenticated: !!user && !!accessToken && isTokenValid(accessToken),
    loading,
  };
};
