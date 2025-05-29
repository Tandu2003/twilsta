import {
  Message,
  PaginatedResponse,
  PaginationQuery,
  ReactionType,
  SendMessageRequest,
} from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { messageService } from '@/services/message.service';

interface MessageState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: MessageState = {
  messages: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const getConversationMessages = createAsyncThunk<
  PaginatedResponse<Message>,
  { conversationId: string; query?: PaginationQuery }
>('message/getConversationMessages', async ({ conversationId, query }) => {
  const response = await messageService.getConversationMessages(conversationId, query);
  return response.data!;
});

export const sendMessage = createAsyncThunk<
  Message,
  { conversationId: string; data: SendMessageRequest }
>('message/sendMessage', async ({ conversationId, data }) => {
  const response = await messageService.sendMessage(conversationId, data);
  return response.data!;
});

export const deleteMessage = createAsyncThunk<void, string>('message/deleteMessage', async id => {
  await messageService.deleteMessage(id);
});

export const addReaction = createAsyncThunk<void, { messageId: string; type: ReactionType }>(
  'message/addReaction',
  async ({ messageId, type }) => {
    await messageService.addReaction(messageId, type);
  }
);

export const removeReaction = createAsyncThunk<void, string>(
  'message/removeReaction',
  async messageId => {
    await messageService.removeReaction(messageId);
  }
);

export const markAsRead = createAsyncThunk<void, string>('message/markAsRead', async messageId => {
  await messageService.markAsRead(messageId);
});

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Get Conversation Messages
      .addCase(getConversationMessages.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getConversationMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getConversationMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get messages';
      })
      // Send Message
      .addCase(sendMessage.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send message';
      })
      // Delete Message
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.messages = state.messages.filter(m => m.id !== action.meta.arg);
      })
      // Add Reaction
      .addCase(addReaction.fulfilled, (state, action) => {
        const message = state.messages.find(m => m.id === action.meta.arg.messageId);
        if (message) {
          message.reaction = {
            id: Date.now().toString(),
            type: action.meta.arg.type,
            user: state.messages[0].sender, // Assuming the current user is the sender
            createdAt: new Date().toISOString(),
          };
        }
      })
      // Remove Reaction
      .addCase(removeReaction.fulfilled, (state, action) => {
        const message = state.messages.find(m => m.id === action.meta.arg);
        if (message) {
          message.reaction = undefined;
        }
      })
      // Mark As Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const message = state.messages.find(m => m.id === action.meta.arg);
        if (message) {
          message.isRead = true;
        }
      });
  },
});

export const { clearError } = messageSlice.actions;
export default messageSlice.reducer;
