import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

export const handleGroup = (socket: AuthenticatedSocket) => {
  // Create new group
  socket.on(
    'group:create',
    (data: {
      name: string;
      description?: string;
      members: string[];
      admins: string[];
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const groupId = Date.now().toString(); // Temporary ID, should be replaced with DB ID

      // Notify all members about the new group
      data.members.forEach((memberId) => {
        if (memberId !== socket.userId) {
          socket.to(memberId).emit('group:created', {
            groupId,
            name: data.name,
            description: data.description,
            createdBy: socket.userId,
            members: data.members,
            admins: data.admins,
            createdAt: new Date().toISOString(),
          });
        }
      });

      logger.info(`Group ${groupId} created by user ${socket.userId}`);
    }
  );

  // Update group info
  socket.on(
    'group:update',
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

  // Add member to group
  socket.on(
    'group:add_member',
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

  // Remove member from group
  socket.on(
    'group:remove_member',
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

  // Leave group
  socket.on('group:leave', (data: { groupId: string }) => {
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

  // Promote member to admin
  socket.on(
    'group:promote_admin',
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

  // Demote admin to member
  socket.on(
    'group:demote_admin',
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
};
