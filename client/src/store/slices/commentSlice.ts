import { Comment, CreateCommentRequest, PaginatedResponse, PaginationQuery } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { commentService } from '@/services/comment.service';

interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: CommentState = {
  comments: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const createComment = createAsyncThunk<
  Comment,
  { postId: string; data: CreateCommentRequest }
>('comment/createComment', async ({ postId, data }) => {
  const response = await commentService.createComment(postId, data);
  return response.data!;
});

export const getPostComments = createAsyncThunk<
  PaginatedResponse<Comment>,
  { postId: string; query?: PaginationQuery }
>('comment/getPostComments', async ({ postId, query }) => {
  const response = await commentService.getPostComments(postId, query);
  return response.data!;
});

export const updateComment = createAsyncThunk<Comment, { id: string; content: string }>(
  'comment/updateComment',
  async ({ id, content }) => {
    const response = await commentService.updateComment(id, content);
    return response.data!;
  }
);

export const deleteComment = createAsyncThunk<void, string>('comment/deleteComment', async id => {
  await commentService.deleteComment(id);
});

export const likeComment = createAsyncThunk<void, string>('comment/likeComment', async id => {
  await commentService.likeComment(id);
});

export const unlikeComment = createAsyncThunk<void, string>('comment/unlikeComment', async id => {
  await commentService.unlikeComment(id);
});

const commentSlice = createSlice({
  name: 'comment',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Create Comment
      .addCase(createComment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.loading = false;
        state.comments.unshift(action.payload);
      })
      .addCase(createComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create comment';
      })
      // Get Post Comments
      .addCase(getPostComments.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPostComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getPostComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get comments';
      })
      // Update Comment
      .addCase(updateComment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.comments.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.comments[index] = action.payload;
        }
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update comment';
      })
      // Delete Comment
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.comments = state.comments.filter(c => c.id !== action.meta.arg);
      })
      // Like Comment
      .addCase(likeComment.fulfilled, (state, action) => {
        const comment = state.comments.find(c => c.id === action.meta.arg);
        if (comment) {
          comment.isLiked = true;
          comment.likesCount += 1;
        }
      })
      // Unlike Comment
      .addCase(unlikeComment.fulfilled, (state, action) => {
        const comment = state.comments.find(c => c.id === action.meta.arg);
        if (comment) {
          comment.isLiked = false;
          comment.likesCount -= 1;
        }
      });
  },
});

export const { clearError } = commentSlice.actions;
export default commentSlice.reducer;
