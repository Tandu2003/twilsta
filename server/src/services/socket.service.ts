import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { FastifyInstance } from 'fastify';
import { handleAuth } from '../sockets/auth';
import { handleRoom } from '../sockets/room';
import { handleConnection } from '../sockets/connection';
import { handleMessage } from '../sockets/message';
import { handleGroup } from '../sockets/group';
import { handleConversation } from '../sockets/conversation';
import { handleActivity } from '../sockets/activity';
import { handlePost } from '../sockets/post';
import { handleStory } from '../sockets/story';
import { handleUpload } from '../sockets/upload';
import { handleFeed } from '../sockets/feed';
import { handleFollow } from '../sockets/follow';
import { AuthenticatedSocket } from '../types/authSocket';

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

      // Handle activity operations
      handleActivity(socket);

      // Handle post operations
      handlePost(socket);

      // Handle story operations
      handleStory(socket);

      // Handle upload operations
      handleUpload(socket);

      // Handle feed operations
      handleFeed(socket);

      // Handle follow operations
      handleFollow(socket);

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
