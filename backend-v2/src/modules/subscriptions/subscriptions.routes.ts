import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { subscriptionService } from './subscriptions.service';
import { authenticate } from '../../shared/middleware/authenticate';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  listSubscriptionsQuerySchema,
} from '../../shared/schemas/subscription.schema';
import { ZodError } from 'zod';

/**
 * Register subscription routes
 */
export async function subscriptionRoutes(app: FastifyInstance): Promise<void> {
  // All subscription routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /subscriptions
   * Get all subscriptions for the authenticated user
   */
  app.get('/subscriptions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      // Parse and validate query parameters
      const query = listSubscriptionsQuerySchema.parse(request.query);

      const subscriptions = await subscriptionService.getAllSubscriptions(request.user.userId, {
        status: query.status,
        category: query.category,
        limit: query.limit,
        offset: query.offset,
      });

      return reply.send(subscriptions);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      request.log.error({ error }, 'Get subscriptions error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch subscriptions',
      });
    }
  });

  /**
   * GET /subscriptions/:id
   * Get a single subscription by ID
   */
  app.get('/subscriptions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      const subscription = await subscriptionService.getSubscriptionById(request.user.userId, id);

      return reply.send(subscription);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subscription';

      request.log.error({ error }, 'Get subscription error');

      if (message.includes('not found')) {
        return reply.status(404).send({
          error: 'Not Found',
          message,
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });

  /**
   * POST /subscriptions
   * Create a new subscription
   */
  app.post('/subscriptions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      // Validate request body
      const body = createSubscriptionSchema.parse(request.body);

      const subscription = await subscriptionService.createSubscription(request.user.userId, body);

      return reply.status(201).send(subscription);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid subscription data',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      request.log.error({ error }, 'Create subscription error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create subscription',
      });
    }
  });

  /**
   * PUT /subscriptions/:id
   * Update a subscription
   */
  app.put('/subscriptions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      // Validate request body
      const body = updateSubscriptionSchema.parse(request.body);

      const subscription = await subscriptionService.updateSubscription(
        request.user.userId,
        id,
        body
      );

      return reply.send(subscription);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid subscription data',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Failed to update subscription';

      request.log.error({ error }, 'Update subscription error');

      if (message.includes('not found')) {
        return reply.status(404).send({
          error: 'Not Found',
          message,
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });

  /**
   * DELETE /subscriptions/:id
   * Delete a subscription
   */
  app.delete('/subscriptions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      await subscriptionService.deleteSubscription(request.user.userId, id);

      return reply.send({ message: 'Subscription deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete subscription';

      request.log.error({ error }, 'Delete subscription error');

      if (message.includes('not found')) {
        return reply.status(404).send({
          error: 'Not Found',
          message,
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });
}
