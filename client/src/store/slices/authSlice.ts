import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
} from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk<AuthResponse, LoginRequest>('auth/login', async data => {
  const response = await authService.login(data);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Login failed');
  }
  return response.data!;
});

export const register = createAsyncThunk<void, RegisterRequest>('auth/register', async data => {
  const response = await authService.register(data);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Registration failed');
  }
});

export const checkAuth = createAsyncThunk<{ user: User }, void>(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.checkAuth();
      if (!response.success) {
        throw new Error(response.error || response.message || 'Authentication check failed');
      }
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Authentication check failed');
    }
  }
);

export const refreshTokens = createAsyncThunk<{ accessToken: string; refreshToken: string }, void>(
  'auth/refreshTokens',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const refreshToken = state.auth.refreshToken;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authService.refreshToken(refreshToken);
      if (!response.success) {
        throw new Error(response.error || response.message || 'Token refresh failed');
      }
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

export const logout = createAsyncThunk<void, void>('auth/logout', async () => {
  const response = await authService.logout();
  if (!response.success) {
    throw new Error(response.error || response.message || 'Logout failed');
  }
});

export const forgotPassword = createAsyncThunk<void, ForgotPasswordRequest>(
  'auth/forgotPassword',
  async data => {
    const response = await authService.forgotPassword(data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to send reset password email');
    }
  }
);

export const resetPassword = createAsyncThunk<void, ResetPasswordRequest>(
  'auth/resetPassword',
  async data => {
    const response = await authService.resetPassword(data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to reset password');
    }
  }
);

export const verifyEmail = createAsyncThunk<void, VerifyEmailRequest>(
  'auth/verifyEmail',
  async data => {
    const response = await authService.verifyEmail(data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to verify email');
    }
  }
);

export const resendVerification = createAsyncThunk<void, { email: string }>(
  'auth/resendVerification',
  async data => {
    const response = await authService.resendVerification(data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to resend verification email');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setTokens: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearAuth: state => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Login
      .addCase(login.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, state => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Check Auth
      .addCase(checkAuth.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      })
      // Refresh Tokens
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(refreshTokens.rejected, state => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      })
      // Logout
      .addCase(logout.fulfilled, state => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      })
      // Forgot Password
      .addCase(forgotPassword.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, state => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send reset password email';
      })
      // Reset Password
      .addCase(resetPassword.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, state => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to reset password';
      })
      // Verify Email
      .addCase(verifyEmail.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, state => {
        state.loading = false;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to verify email';
      })
      // Resend Verification
      .addCase(resendVerification.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendVerification.fulfilled, state => {
        state.loading = false;
      })
      .addCase(resendVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to resend verification email';
      });
  },
});

export const { clearError, setTokens, clearAuth } = authSlice.actions;
export default authSlice.reducer;
