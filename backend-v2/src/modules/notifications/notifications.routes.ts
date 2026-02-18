import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from './notifications.service';
import { authenticate } from '../../shared/middleware/authenticate';

/**
 * Register notification routes
 */
export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // All notification routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /notifications
   * Get notifications for the authenticated user
   */
  app.get('/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { limit, unreadOnly } = request.query as { limit?: string; unreadOnly?: string };
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const unreadOnlyBool = unreadOnly === 'true';

      const notifications = await notificationService.getNotifications(
        request.user.userId,
        limitNum,
        unreadOnlyBool
      );

      return reply.send(notifications);
    } catch (error) {
      request.log.error({ error }, 'Get notifications error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch notifications',
      });
    }
  });

  /**
   * GET /notifications/unread-count
   * Get unread notification count
   */
  app.get('/notifications/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const count = await notificationService.getUnreadCount(request.user.userId);

      return reply.send({ count });
    } catch (error) {
      request.log.error({ error }, 'Get unread count error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch unread count',
      });
    }
  });

  /**
   * PATCH /notifications/:id/read
   * Mark notification as read
   */
  app.patch('/notifications/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      await notificationService.markAsRead(request.user.userId, id);

      return reply.send({ message: 'Notification marked as read' });
    } catch (error) {
      request.log.error({ error }, 'Mark notification as read error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to mark notification as read',
      });
    }
  });

  /**
   * PATCH /notifications/read-all
   * Mark all notifications as read
   */
  app.patch('/notifications/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      await notificationService.markAllAsRead(request.user.userId);

      return reply.send({ message: 'All notifications marked as read' });
    } catch (error) {
      request.log.error({ error }, 'Mark all notifications as read error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to mark all notifications as read',
      });
    }
  });

  /**
   * DELETE /notifications/:id
   * Delete notification
   */
  app.delete('/notifications/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      await notificationService.deleteNotification(request.user.userId, id);

      return reply.send({ message: 'Notification deleted' });
    } catch (error) {
      request.log.error({ error }, 'Delete notification error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete notification',
      });
    }
  });
}
