import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from './analytics.service';
import { authenticate } from '../../shared/middleware/authenticate';

/**
 * Register analytics routes
 */
export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  // All analytics routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /analytics
   * Get analytics overview for the authenticated user
   */
  app.get('/analytics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const overview = await analyticsService.getOverview(request.user.userId);

      return reply.send(overview);
    } catch (error) {
      request.log.error({ error }, 'Get analytics error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch analytics',
      });
    }
  });

  /**
   * GET /analytics/trends
   * Get spending trends over time
   */
  app.get('/analytics/trends', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { months } = request.query as { months?: string };
      const monthsNum = months ? parseInt(months, 10) : 6;

      const trends = await analyticsService.getSpendingTrends(request.user.userId, monthsNum);

      return reply.send(trends);
    } catch (error) {
      request.log.error({ error }, 'Get trends error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch trends',
      });
    }
  });

  /**
   * GET /analytics/expensive
   * Get most expensive subscriptions
   */
  app.get('/analytics/expensive', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { limit } = request.query as { limit?: string };
      const limitNum = limit ? parseInt(limit, 10) : 5;

      const expensive = await analyticsService.getMostExpensive(request.user.userId, limitNum);

      return reply.send(expensive);
    } catch (error) {
      request.log.error({ error }, 'Get expensive subscriptions error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch expensive subscriptions',
      });
    }
  });
}
