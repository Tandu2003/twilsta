import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export const handleAuth = (
  socket: AuthenticatedSocket,
  connectedUsers: Map<string, string>
) => {
  socket.on('authenticate', async (token: string) => {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as any;
      socket.userId = decoded.userId;
      socket.user = decoded;
      connectedUsers.set(decoded.userId, socket.id);

      socket.emit('authenticated', { userId: decoded.userId });
      logger.info(`User authenticated: ${decoded.userId}`);
    } catch (error) {
      socket.emit('auth_error', { message: 'Authentication failed' });
      logger.error('Authentication error:', error);
    }
  });
};
