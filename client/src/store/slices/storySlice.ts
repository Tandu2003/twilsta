import { CreateStoryRequest, Story } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { storyService } from '@/services/story.service';

interface StoryState {
  stories: Story[];
  currentUserStories: Story[];
  loading: boolean;
  error: string | null;
}

const initialState: StoryState = {
  stories: [],
  currentUserStories: [],
  loading: false,
  error: null,
};

export const createStory = createAsyncThunk<Story, CreateStoryRequest>(
  'story/createStory',
  async data => {
    const response = await storyService.createStory(data);
    return response.data!;
  }
);

export const getCurrentUserStories = createAsyncThunk<Story[]>(
  'story/getCurrentUserStories',
  async () => {
    const response = await storyService.getCurrentUserStories();
    return response.data!.stories;
  }
);

export const getUserStories = createAsyncThunk<Story[], string>(
  'story/getUserStories',
  async userId => {
    const response = await storyService.getUserStories(userId);
    return response.data!.stories;
  }
);

export const getStoriesFeed = createAsyncThunk<Story[]>('story/getStoriesFeed', async () => {
  const response = await storyService.getStoriesFeed();
  return response.data!.stories;
});

export const deleteStory = createAsyncThunk<void, string>('story/deleteStory', async id => {
  await storyService.deleteStory(id);
});

const storySlice = createSlice({
  name: 'story',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Create Story
      .addCase(createStory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStory.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUserStories.unshift(action.payload);
      })
      .addCase(createStory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create story';
      })
      // Get Current User Stories
      .addCase(getCurrentUserStories.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUserStories.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUserStories = action.payload;
      })
      .addCase(getCurrentUserStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get current user stories';
      })
      // Get User Stories
      .addCase(getUserStories.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserStories.fulfilled, (state, action) => {
        state.loading = false;
        state.stories = action.payload;
      })
      .addCase(getUserStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get user stories';
      })
      // Get Stories Feed
      .addCase(getStoriesFeed.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoriesFeed.fulfilled, (state, action) => {
        state.loading = false;
        state.stories = action.payload;
      })
      .addCase(getStoriesFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get stories feed';
      })
      // Delete Story
      .addCase(deleteStory.fulfilled, (state, action) => {
        state.currentUserStories = state.currentUserStories.filter(
          story => story.id !== action.meta.arg
        );
        state.stories = state.stories.filter(story => story.id !== action.meta.arg);
      });
  },
});

export const { clearError } = storySlice.actions;
export default storySlice.reducer;
