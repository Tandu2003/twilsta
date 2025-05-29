import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/authSocket';

interface UploadSession {
  fileId: string;
  totalChunks: number;
  receivedChunks: number;
  fileSize: number;
  uploadedSize: number;
  fileName: string;
  fileType: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export const handleUpload = (socket: AuthenticatedSocket) => {
  // Store active upload sessions
  const uploadSessions = new Map<string, UploadSession>();

  // Start upload
  socket.on(
    'upload:start',
    (data: {
      fileId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      totalChunks: number;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Initialize upload session
      const session: UploadSession = {
        fileId: data.fileId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        totalChunks: data.totalChunks,
        receivedChunks: 0,
        uploadedSize: 0,
        processingStatus: 'pending',
      };

      uploadSessions.set(data.fileId, session);

      logger.info(
        `User ${socket.userId} started upload for file ${data.fileName}`
      );
    }
  );

  // Handle chunk upload
  socket.on(
    'upload:chunk',
    (data: {
      fileId: string;
      chunkIndex: number;
      chunkData: Buffer;
      isLastChunk: boolean;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const session = uploadSessions.get(data.fileId);
      if (!session) {
        socket.emit('upload:error', {
          fileId: data.fileId,
          error: 'Upload session not found',
        });
        return;
      }

      try {
        // Process chunk (in real implementation, save to disk/storage)
        session.receivedChunks++;
        session.uploadedSize += data.chunkData.length;

        // Calculate and emit progress
        const progress = (session.uploadedSize / session.fileSize) * 100;
        socket.emit('upload:progress', {
          fileId: data.fileId,
          progress: Math.round(progress),
          uploadedSize: session.uploadedSize,
          totalSize: session.fileSize,
        });

        // If this is the last chunk, start processing
        if (data.isLastChunk) {
          session.processingStatus = 'processing';
          socket.emit('upload:processing', {
            fileId: data.fileId,
            status: 'processing',
            message: 'Processing your file...',
          });

          // Simulate processing (replace with actual processing logic)
          setTimeout(() => {
            session.processingStatus = 'completed';
            socket.emit('upload:processing', {
              fileId: data.fileId,
              status: 'completed',
              message: 'File processing completed',
            });
          }, 2000);
        }

        logger.info(
          `User ${socket.userId} uploaded chunk ${data.chunkIndex} for file ${session.fileName}`
        );
      } catch (error) {
        logger.error(
          `Error processing chunk for file ${session.fileName}: ${error}`
        );
        socket.emit('upload:error', {
          fileId: data.fileId,
          error: 'Failed to process chunk',
        });
      }
    }
  );

  // Complete upload
  socket.on('upload:complete', (data: { fileId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const session = uploadSessions.get(data.fileId);
    if (!session) {
      socket.emit('upload:error', {
        fileId: data.fileId,
        error: 'Upload session not found',
      });
      return;
    }

    // Verify all chunks were received
    if (session.receivedChunks !== session.totalChunks) {
      socket.emit('upload:error', {
        fileId: data.fileId,
        error: 'Incomplete upload',
      });
      return;
    }

    // Emit success
    socket.emit('upload:success', {
      fileId: data.fileId,
      fileName: session.fileName,
      fileType: session.fileType,
      fileSize: session.fileSize,
    });

    logger.info(
      `User ${socket.userId} completed upload for file ${session.fileName}`
    );
  });

  // Cancel upload
  socket.on('upload:cancel', (data: { fileId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const session = uploadSessions.get(data.fileId);
    if (!session) {
      socket.emit('upload:error', {
        fileId: data.fileId,
        error: 'Upload session not found',
      });
      return;
    }

    // Clean up resources (in real implementation, delete partial files)
    uploadSessions.delete(data.fileId);

    socket.emit('upload:error', {
      fileId: data.fileId,
      error: 'Upload cancelled by user',
    });

    logger.info(
      `User ${socket.userId} cancelled upload for file ${session.fileName}`
    );
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    // Clean up any incomplete uploads
    for (const [fileId, session] of uploadSessions.entries()) {
      if (session.receivedChunks !== session.totalChunks) {
        // Clean up resources (in real implementation, delete partial files)
        uploadSessions.delete(fileId);
        logger.info(
          `Cleaned up incomplete upload for file ${session.fileName}`
        );
      }
    }
  });
};
