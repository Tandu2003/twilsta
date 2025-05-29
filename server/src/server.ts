import { fastify } from 'fastify';
import { registerPlugins } from './app';
import logger from './utils/logger';
import SocketService from './services/socket.service';

const server = fastify({
  logger: false, // We'll use our custom logger
});

const start = async () => {
  try {
    // Register all plugins and routes
    await registerPlugins(server);

    // Initialize socket service
    const socketService = new SocketService(server);
    server.decorate('socketService', socketService);

    // Start server
    const port = Number(process.env.PORT) || 3000;
    const host =
      process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    await server.listen({ port, host });
    logger.info(`🚀 Server running on http://${host}:${port}`);
    logger.info(
      `📚 Swagger UI available at http://${host}:${port}/documentation`
    );
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async () => {
  try {
    logger.info('🔄 Gracefully shutting down server...');
    await server.close();
    logger.info('✅ Server closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();
