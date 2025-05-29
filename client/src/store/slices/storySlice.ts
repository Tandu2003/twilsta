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
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to create story');
    }
    return response.data!;
  }
);

export const getCurrentUserStories = createAsyncThunk<Story[], void>(
  'story/getCurrentUserStories',
  async () => {
    const response = await storyService.getCurrentUserStories();
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to get stories');
    }
    return response.data!;
  }
);

export const getUserStories = createAsyncThunk<Story[], string>(
  'story/getUserStories',
  async userId => {
    const response = await storyService.getUserStories(userId);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to get user stories');
    }
    return response.data!;
  }
);

export const getFollowedUsersStories = createAsyncThunk<Story[], void>(
  'story/getFollowedUsersStories',
  async () => {
    const response = await storyService.getFollowedUsersStories();
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to get followed users stories');
    }
    return response.data!;
  }
);

export const getStoriesFeed = createAsyncThunk<Story[]>('story/getStoriesFeed', async () => {
  const response = await storyService.getStoriesFeed();
  return response.data!.stories;
});

export const deleteStory = createAsyncThunk<void, string>('story/deleteStory', async id => {
  const response = await storyService.deleteStory(id);
  if (!response.success) {
    throw new Error(response.error || response.message || 'Failed to delete story');
  }
});

export const markStoryAsViewed = createAsyncThunk<void, string>(
  'story/markStoryAsViewed',
  async storyId => {
    const response = await storyService.markStoryAsViewed(storyId);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to mark story as viewed');
    }
  }
);

export const getStoryViewers = createAsyncThunk<User[], string>(
  'story/getStoryViewers',
  async storyId => {
    const response = await storyService.getStoryViewers(storyId);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to get story viewers');
    }
    return response.data!;
  }
);

export const reactToStory = createAsyncThunk<void, { storyId: string; type: ReactionType }>(
  'story/reactToStory',
  async ({ storyId, type }) => {
    const response = await storyService.reactToStory(storyId, type);
    if (!response.success) {
      throw new Error(response.error || response.message || 'Failed to react to story');
    }
  }
);

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
      })
      // Get Followed Users Stories
      .addCase(getFollowedUsersStories.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFollowedUsersStories.fulfilled, (state, action) => {
        state.loading = false;
        state.stories = action.payload;
      })
      .addCase(getFollowedUsersStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get followed users stories';
      })
      // Mark Story as Viewed
      .addCase(markStoryAsViewed.fulfilled, (state, action) => {
        state.currentUserStories = state.currentUserStories.filter(
          story => story.id !== action.meta.arg
        );
        state.stories = state.stories.filter(story => story.id !== action.meta.arg);
      })
      // Get Story Viewers
      .addCase(getStoryViewers.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoryViewers.fulfilled, (state, action) => {
        state.loading = false;
        state.stories = action.payload;
      })
      .addCase(getStoryViewers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get story viewers';
      })
      // React to Story
      .addCase(reactToStory.fulfilled, (state, action) => {
        state.currentUserStories = state.currentUserStories.filter(
          story => story.id !== action.meta.arg.storyId
        );
        state.stories = state.stories.filter(story => story.id !== action.meta.arg.storyId);
      });
  },
});

export const { clearError } = storySlice.actions;
export default storySlice.reducer;
