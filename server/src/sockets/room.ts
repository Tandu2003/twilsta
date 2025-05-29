import { Socket } from 'socket.io';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export const handleRoom = (socket: AuthenticatedSocket) => {
  // Handle room joining
  socket.on('join_room', (roomId: string) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    socket.join(roomId);
    socket.emit('room_joined', { roomId });
    logger.info(`User ${socket.userId} joined room: ${roomId}`);
  });

  // Handle room leaving
  socket.on('leave_room', (roomId: string) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    socket.leave(roomId);
    socket.emit('room_left', { roomId });
    logger.info(`User ${socket.userId} left room: ${roomId}`);
  });
};
