import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { FastifyInstance } from 'fastify';
import { handleAuth } from '../sockets/auth.socket';
import { handleRoom } from '../sockets/room.socket';
import { handleConnection } from '../sockets/connection.socket';
import { handleMessage } from '../sockets/message.socket';
import { handleGroup } from '../sockets/group.socket';
import { handleConversation } from '../sockets/conversation.socket';
import { AuthenticatedSocket } from '../sockets/types';

class SocketService {
  private io: SocketServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: FastifyInstance) {
    const httpServer = server.server as HttpServer;
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // Handle authentication
      handleAuth(socket, this.connectedUsers);

      // Handle room operations
      handleRoom(socket);

      // Handle message operations
      handleMessage(socket);

      // Handle group operations
      handleGroup(socket);

      // Handle conversation operations
      handleConversation(socket);

      // Handle connection events
      handleConnection(socket, this.connectedUsers);
    });
  }

  // Method to emit to specific room
  public emitToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
  }

  // Method to emit to specific user
  public emitToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Method to broadcast to all connected clients
  public broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
}

export default SocketService;
