import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { enhancedAnalyticsService } from './analytics.service.enhanced';
import { authenticate } from '../../shared/middleware/authenticate';

/**
 * Register enhanced analytics routes
 * Includes advanced features: trends, price changes, insights, exports
 */
export async function enhancedAnalyticsRoutes(app: FastifyInstance): Promise<void> {
  // All analytics routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /analytics/overview
   * Get analytics overview for the authenticated user
   */
  app.get('/analytics/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const overview = await enhancedAnalyticsService.getOverview(request.user.userId);

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
   * Get spending trends over time with YoY comparison
   */
  app.get('/analytics/trends', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { months, granularity } = request.query as {
        months?: string;
        granularity?: 'monthly' | 'quarterly' | 'yearly';
      };

      const monthsNum = months ? parseInt(months, 10) : 12;
      const gran = granularity || 'monthly';

      const trends = await enhancedAnalyticsService.getSpendingTrends(
        request.user.userId,
        monthsNum,
        gran
      );

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
   * GET /analytics/price-changes
   * Get subscription price changes
   */
  app.get('/analytics/price-changes', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { limit } = request.query as { limit?: string };
      const limitNum = limit ? parseInt(limit, 10) : 10;

      const priceChanges = await enhancedAnalyticsService.getPriceChanges(
        request.user.userId,
        limitNum
      );

      return reply.send(priceChanges);
    } catch (error) {
      request.log.error({ error }, 'Get price changes error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch price changes',
      });
    }
  });

  /**
   * GET /analytics/insights
   * Get AI-powered insights and recommendations
   */
  app.get('/analytics/insights', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const insights = await enhancedAnalyticsService.generateInsights(request.user.userId);

      return reply.send(insights);
    } catch (error) {
      request.log.error({ error }, 'Get insights error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate insights',
      });
    }
  });

  /**
   * GET /analytics/yearly-patterns
   * Analyze yearly patterns from detected subscriptions
   */
  app.get('/analytics/yearly-patterns', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const patterns = await enhancedAnalyticsService.analyzeYearlyPatterns(request.user.userId);

      return reply.send(patterns);
    } catch (error) {
      request.log.error({ error }, 'Get yearly patterns error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to analyze yearly patterns',
      });
    }
  });

  /**
   * GET /analytics/export
   * Export subscriptions to CSV
   */
  app.get('/analytics/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const csv = await enhancedAnalyticsService.exportToCSV(request.user.userId);

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename=subscriptions.csv');

      return reply.send(csv);
    } catch (error) {
      request.log.error({ error }, 'Export subscriptions error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export subscriptions',
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

      const expensive = await enhancedAnalyticsService.getMostExpensive(
        request.user.userId,
        limitNum
      );

      return reply.send(expensive);
    } catch (error) {
      request.log.error({ error }, 'Get expensive subscriptions error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch expensive subscriptions',
      });
    }
  });

  /**
   * GET /analytics/categories
   * Get category breakdown (alias for overview categoryBreakdown)
   */
  app.get('/analytics/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const overview = await enhancedAnalyticsService.getOverview(request.user.userId);

      return reply.send({
        categories: overview.categoryBreakdown,
        totalCategories: overview.categoryBreakdown.length,
      });
    } catch (error) {
      request.log.error({ error }, 'Get categories error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch categories',
      });
    }
  });
}
