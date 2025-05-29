import { PaginatedResponse, PaginationQuery, User } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { userService } from '@/services/user.service';

interface UserState {
  currentUser: User | null;
  selectedUser: User | null;
  followers: User[];
  following: User[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: UserState = {
  currentUser: null,
  selectedUser: null,
  followers: [],
  following: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const getCurrentUser = createAsyncThunk<User, void>('user/getCurrentUser', async () => {
  const response = await userService.getCurrentUser();
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to get current user');
  }
  return response.data!;
});

export const updateCurrentUser = createAsyncThunk<User, UpdateUserRequest>(
  'user/updateCurrentUser',
  async data => {
    const response = await userService.updateCurrentUser(data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to update user');
    }
    return response.data!;
  }
);

export const getUserById = createAsyncThunk<User, string>('user/getUserById', async id => {
  const response = await userService.getUserById(id);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to get user');
  }
  return response.data!;
});

export const getUserByUsername = createAsyncThunk<User, string>(
  'user/getUserByUsername',
  async username => {
    const response = await userService.getUserByUsername(username);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to get user');
    }
    return response.data!;
  }
);

export const getFollowers = createAsyncThunk<
  PaginatedResponse<User>,
  { userId: string; query?: PaginationQuery }
>('user/getFollowers', async ({ userId, query }) => {
  const response = await userService.getFollowers(userId, query);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to get followers');
  }
  return response.data!;
});

export const getFollowing = createAsyncThunk<
  PaginatedResponse<User>,
  { userId: string; query?: PaginationQuery }
>('user/getFollowing', async ({ userId, query }) => {
  const response = await userService.getFollowing(userId, query);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to get following');
  }
  return response.data!;
});

export const followUser = createAsyncThunk<void, string>('user/followUser', async userId => {
  await userService.followUser(userId);
});

export const unfollowUser = createAsyncThunk<void, string>('user/unfollowUser', async userId => {
  await userService.unfollowUser(userId);
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearSelectedUser: state => {
      state.selectedUser = null;
    },
  },
  extraReducers: builder => {
    builder
      // Get Current User
      .addCase(getCurrentUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get current user';
      })
      // Update Current User
      .addCase(updateCurrentUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(updateCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update user';
      })
      // Get User By Id
      .addCase(getUserById.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload;
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get user';
      })
      // Get User By Username
      .addCase(getUserByUsername.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserByUsername.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload;
      })
      .addCase(getUserByUsername.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get user';
      })
      // Get Followers
      .addCase(getFollowers.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFollowers.fulfilled, (state, action) => {
        state.loading = false;
        state.followers = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getFollowers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get followers';
      })
      // Get Following
      .addCase(getFollowing.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFollowing.fulfilled, (state, action) => {
        state.loading = false;
        state.following = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getFollowing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get following';
      });
  },
});

export const { clearError, clearSelectedUser } = userSlice.actions;
export default userSlice.reducer;
