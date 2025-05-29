import { configureStore } from '@reduxjs/toolkit';

import authSlice from './slices/authSlice';
import commentReducer from './slices/commentSlice';
import messageReducer from './slices/messageSlice';
import postReducer from './slices/postSlice';
import storyReducer from './slices/storySlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userReducer,
    post: postReducer,
    comment: commentReducer,
    story: storyReducer,
    message: messageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
