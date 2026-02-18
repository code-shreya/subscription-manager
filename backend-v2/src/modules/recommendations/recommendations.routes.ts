import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { recommendationsService } from './recommendations.service';
import { authenticate } from '../../shared/middleware/authenticate';

/**
 * Recommendations routes
 */
export async function recommendationsRoutes(app: FastifyInstance) {
  // Get all recommendations for user
  app.get(
    '/recommendations',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get AI-powered savings recommendations',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'duplicate',
                    'downgrade',
                    'alternative',
                    'family_plan',
                    'bundle',
                    'cancel',
                    'high_spending',
                    'price_increase',
                  ],
                },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                title: { type: 'string' },
                description: { type: 'string' },
                action: { type: 'string' },
                potentialSavings: { type: 'number' },
                affectedSubscriptions: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid' },
                },
                metadata: { type: 'object' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const recommendations = await recommendationsService.getRecommendations(userId);
      return reply.send(recommendations);
    }
  );

  // Get recommendation statistics
  app.get(
    '/recommendations/stats',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get recommendation statistics',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              totalRecommendations: { type: 'integer' },
              byType: {
                type: 'object',
                additionalProperties: { type: 'integer' },
              },
              byPriority: {
                type: 'object',
                additionalProperties: { type: 'integer' },
              },
              totalPotentialSavings: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const stats = await recommendationsService.getRecommendationStats(userId);
      return reply.send(stats);
    }
  );

  // Get AI-powered personalized recommendations
  app.get(
    '/recommendations/ai',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get AI-powered personalized recommendations using GPT-4',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              recommendations: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;

      try {
        const aiRecommendations = await recommendationsService.getAIRecommendations(userId);
        return reply.send(aiRecommendations);
      } catch (error: any) {
        if (error.message === 'OpenAI not configured') {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'AI recommendations require OpenAI API key to be configured',
          });
        }
        throw error;
      }
    }
  );

  // Get duplicate subscriptions
  app.get(
    '/recommendations/duplicates',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get duplicate subscription recommendations',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const recommendations = await recommendationsService.getRecommendations(userId);
      const duplicates = recommendations.filter((r) => r.type === 'duplicate');
      return reply.send(duplicates);
    }
  );

  // Get downgrade opportunities
  app.get(
    '/recommendations/downgrades',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get downgrade recommendations (cheaper plans)',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const recommendations = await recommendationsService.getRecommendations(userId);
      const downgrades = recommendations.filter((r) => r.type === 'downgrade');
      return reply.send(downgrades);
    }
  );

  // Get alternative services
  app.get(
    '/recommendations/alternatives',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get alternative service recommendations',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const recommendations = await recommendationsService.getRecommendations(userId);
      const alternatives = recommendations.filter((r) => r.type === 'alternative');
      return reply.send(alternatives);
    }
  );

  // Get family plan opportunities
  app.get(
    '/recommendations/family-plans',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get family plan recommendations',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const recommendations = await recommendationsService.getRecommendations(userId);
      const familyPlans = recommendations.filter((r) => r.type === 'family_plan');
      return reply.send(familyPlans);
    }
  );

  // Get bundle opportunities
  app.get(
    '/recommendations/bundles',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get bundle recommendations',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const recommendations = await recommendationsService.getRecommendations(userId);
      const bundles = recommendations.filter((r) => r.type === 'bundle');
      return reply.send(bundles);
    }
  );

  // Get high spending alerts
  app.get(
    '/recommendations/spending-alerts',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get high spending alerts',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const recommendations = await recommendationsService.getRecommendations(userId);
      const spendingAlerts = recommendations.filter((r) => r.type === 'high_spending');
      return reply.send(spendingAlerts);
    }
  );
}
