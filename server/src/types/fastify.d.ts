import 'fastify';
import { FastifyInstance } from 'fastify';
import SocketService from '../services/socket.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      email: string;
      isVerified: boolean;
      role?: string;
    };
  }

  interface FastifyInstance {
    socketService: SocketService;
  }
}
