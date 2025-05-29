import { CreatePostRequest, PaginatedResponse, PaginationQuery, Post } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { postService } from '@/services/post.service';

interface PostState {
  posts: Post[];
  selectedPost: Post | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: PostState = {
  posts: [],
  selectedPost: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const createPost = createAsyncThunk<Post, CreatePostRequest>(
  'post/createPost',
  async data => {
    const response = await postService.createPost(data);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to create post');
    }
    return response.data!;
  }
);

export const getPost = createAsyncThunk<Post, string>('post/getPost', async id => {
  const response = await postService.getPost(id);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to get post');
  }
  return response.data!;
});

export const getUserPosts = createAsyncThunk<
  PaginatedResponse<Post>,
  { userId: string; query?: PaginationQuery }
>('post/getUserPosts', async ({ userId, query }) => {
  const response = await postService.getUserPosts(userId, query);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to get user posts');
  }
  return response.data!;
});

export const getCurrentUserPosts = createAsyncThunk<PaginatedResponse<Post>, PaginationQuery>(
  'post/getCurrentUserPosts',
  async query => {
    const response = await postService.getCurrentUserPosts(query);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to get current user posts');
    }
    return response.data!;
  }
);

export const deletePost = createAsyncThunk<void, string>('post/deletePost', async id => {
  const response = await postService.deletePost(id);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to delete post');
  }
});

export const likePost = createAsyncThunk<void, string>('post/likePost', async id => {
  const response = await postService.likePost(id);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to like post');
  }
});

export const unlikePost = createAsyncThunk<void, string>('post/unlikePost', async id => {
  const response = await postService.unlikePost(id);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to unlike post');
  }
});

const postSlice = createSlice({
  name: 'post',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearSelectedPost: state => {
      state.selectedPost = null;
    },
  },
  extraReducers: builder => {
    builder
      // Create Post
      .addCase(createPost.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create post';
      })
      // Get Post
      .addCase(getPost.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPost.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPost = action.payload;
      })
      .addCase(getPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get post';
      })
      // Get User Posts
      .addCase(getUserPosts.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get user posts';
      })
      // Get Current User Posts
      .addCase(getCurrentUserPosts.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getCurrentUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get current user posts';
      })
      // Delete Post
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter(post => post.id !== action.meta.arg);
        if (state.selectedPost?.id === action.meta.arg) {
          state.selectedPost = null;
        }
      })
      // Like Post
      .addCase(likePost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.meta.arg);
        if (post) {
          post.isLiked = true;
          post.likesCount += 1;
        }
        if (state.selectedPost?.id === action.meta.arg) {
          state.selectedPost.isLiked = true;
          state.selectedPost.likesCount += 1;
        }
      })
      // Unlike Post
      .addCase(unlikePost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.meta.arg);
        if (post) {
          post.isLiked = false;
          post.likesCount -= 1;
        }
        if (state.selectedPost?.id === action.meta.arg) {
          state.selectedPost.isLiked = false;
          state.selectedPost.likesCount -= 1;
        }
      });
  },
});

export const { clearError, clearSelectedPost } = postSlice.actions;
export default postSlice.reducer;
