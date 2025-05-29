import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

export const handleGroup = (socket: AuthenticatedSocket) => {
  // Group created
  socket.on(
    'group:created',
    (data: {
      groupId: string;
      name: string;
      description?: string;
      members: string[];
      admins: string[];
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify all members about the new group
      data.members.forEach((memberId) => {
        if (memberId !== socket.userId) {
          socket.to(memberId).emit('group:created', {
            groupId: data.groupId,
            name: data.name,
            description: data.description,
            createdBy: socket.userId,
            members: data.members,
            admins: data.admins,
            createdAt: new Date().toISOString(),
          });
        }
      });

      logger.info(`Group ${data.groupId} created by user ${socket.userId}`);
    }
  );

  // Group updated
  socket.on(
    'group:updated',
    (data: {
      groupId: string;
      updates: {
        name?: string;
        description?: string;
        avatar?: string;
      };
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.to(data.groupId).emit('group:updated', {
        groupId: data.groupId,
        updates: data.updates,
        updatedBy: socket.userId,
        updatedAt: new Date().toISOString(),
      });

      logger.info(`Group ${data.groupId} updated by user ${socket.userId}`);
    }
  );

  // Member added
  socket.on(
    'group:member_added',
    (data: { groupId: string; memberId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.to(data.groupId).emit('group:member_added', {
        groupId: data.groupId,
        memberId: data.memberId,
        addedBy: socket.userId,
        addedAt: new Date().toISOString(),
      });

      logger.info(
        `Member ${data.memberId} added to group ${data.groupId} by user ${socket.userId}`
      );
    }
  );

  // Member removed
  socket.on(
    'group:member_removed',
    (data: { groupId: string; memberId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.to(data.groupId).emit('group:member_removed', {
        groupId: data.groupId,
        memberId: data.memberId,
        removedBy: socket.userId,
        removedAt: new Date().toISOString(),
      });

      logger.info(
        `Member ${data.memberId} removed from group ${data.groupId} by user ${socket.userId}`
      );
    }
  );

  // Member left
  socket.on('group:member_left', (data: { groupId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.to(data.groupId).emit('group:member_left', {
      groupId: data.groupId,
      memberId: socket.userId,
      leftAt: new Date().toISOString(),
    });

    logger.info(`Member ${socket.userId} left group ${data.groupId}`);
  });

  // Admin promoted
  socket.on(
    'group:admin_promoted',
    (data: { groupId: string; memberId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.to(data.groupId).emit('group:admin_promoted', {
        groupId: data.groupId,
        memberId: data.memberId,
        promotedBy: socket.userId,
        promotedAt: new Date().toISOString(),
      });

      logger.info(
        `Member ${data.memberId} promoted to admin in group ${data.groupId} by user ${socket.userId}`
      );
    }
  );

  // Admin demoted
  socket.on(
    'group:admin_demoted',
    (data: { groupId: string; memberId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.to(data.groupId).emit('group:admin_demoted', {
        groupId: data.groupId,
        memberId: data.memberId,
        demotedBy: socket.userId,
        demotedAt: new Date().toISOString(),
      });

      logger.info(
        `Admin ${data.memberId} demoted to member in group ${data.groupId} by user ${socket.userId}`
      );
    }
  );

  // Group deleted
  socket.on('group:deleted', (data: { groupId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.to(data.groupId).emit('group:deleted', {
      groupId: data.groupId,
      deletedBy: socket.userId,
      deletedAt: new Date().toISOString(),
    });

    logger.info(`Group ${data.groupId} deleted by user ${socket.userId}`);
  });
};
