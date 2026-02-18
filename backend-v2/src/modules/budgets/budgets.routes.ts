import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { budgetService, BudgetInput } from './budgets.service';
import { authenticate } from '../../shared/middleware/authenticate';
import { z } from 'zod';

/**
 * Budget input validation schemas
 */
const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).nullable().optional(),
  limit: z.number().positive(),
  currency: z.string().length(3),
  period: z.enum(['monthly', 'quarterly', 'yearly']),
  alert_threshold: z.number().min(0).max(100).optional(),
  start_date: z.string().optional(),
});

const updateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  limit: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  period: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  alert_threshold: z.number().min(0).max(100).optional(),
  start_date: z.string().optional(),
});

/**
 * Register budget routes
 */
export async function budgetRoutes(app: FastifyInstance): Promise<void> {
  // All budget routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /budgets
   * Get all budgets for the authenticated user
   */
  app.get('/budgets', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { includeInactive } = request.query as { includeInactive?: string };
      const includeInactiveBool = includeInactive === 'true';

      const budgets = await budgetService.getBudgets(request.user.userId, includeInactiveBool);

      return reply.send(budgets);
    } catch (error) {
      request.log.error({ error }, 'Get budgets error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch budgets',
      });
    }
  });

  /**
   * GET /budgets/summary
   * Get budget summary for dashboard
   */
  app.get('/budgets/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const summary = await budgetService.getBudgetSummary(request.user.userId);

      return reply.send(summary);
    } catch (error) {
      request.log.error({ error }, 'Get budget summary error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch budget summary',
      });
    }
  });

  /**
   * GET /budgets/statuses
   * Get status for all budgets with real-time spending
   */
  app.get('/budgets/statuses', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const statuses = await budgetService.getAllBudgetStatuses(request.user.userId);

      return reply.send(statuses);
    } catch (error) {
      request.log.error({ error }, 'Get budget statuses error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch budget statuses',
      });
    }
  });

  /**
   * POST /budgets
   * Create a new budget
   */
  app.post('/budgets', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const validatedData = createBudgetSchema.parse(request.body);

      const budget = await budgetService.createBudget(
        request.user.userId,
        validatedData as BudgetInput
      );

      return reply.status(201).send(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid budget data',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Failed to create budget';
      request.log.error({ error }, 'Create budget error');

      if (message.includes('already exists')) {
        return reply.status(409).send({
          error: 'Conflict',
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
   * GET /budgets/:id
   * Get a specific budget
   */
  app.get('/budgets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      const budget = await budgetService.getBudgetById(request.user.userId, id);

      if (!budget) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Budget not found',
        });
      }

      return reply.send(budget);
    } catch (error) {
      request.log.error({ error }, 'Get budget error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch budget',
      });
    }
  });

  /**
   * GET /budgets/:id/status
   * Get budget status with real-time spending
   */
  app.get('/budgets/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      const status = await budgetService.getBudgetStatus(request.user.userId, id);

      return reply.send(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch budget status';
      request.log.error({ error }, 'Get budget status error');

      if (message === 'Budget not found') {
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
   * PUT /budgets/:id
   * Update a budget
   */
  app.put('/budgets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };
      const validatedData = updateBudgetSchema.parse(request.body);

      const budget = await budgetService.updateBudget(request.user.userId, id, validatedData);

      return reply.send(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid budget data',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Failed to update budget';
      request.log.error({ error }, 'Update budget error');

      if (message === 'Budget not found') {
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
   * DELETE /budgets/:id
   * Delete (deactivate) a budget
   */
  app.delete('/budgets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      await budgetService.deleteBudget(request.user.userId, id);

      return reply.send({
        message: 'Budget deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete budget';
      request.log.error({ error }, 'Delete budget error');

      if (message === 'Budget not found') {
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
   * POST /budgets/check-alerts
   * Manually trigger budget alert check
   */
  app.post('/budgets/check-alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const alerts = await budgetService.checkBudgetAlerts(request.user.userId);

      return reply.send({
        message: 'Budget alerts checked',
        alertsTriggered: alerts.length,
        alerts,
      });
    } catch (error) {
      request.log.error({ error }, 'Check budget alerts error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to check budget alerts',
      });
    }
  });
}
