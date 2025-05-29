import { Socket } from 'socket.io';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export const handleConnection = (
  socket: AuthenticatedSocket,
  connectedUsers: Map<string, string>
) => {
  logger.info(`New socket connection: ${socket.id}`);

  // Handle ping
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      logger.info(`User disconnected: ${socket.userId}`);
    }
  });
};
