import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { detectionService } from './detection.service';
import { authenticate } from '../../shared/middleware/authenticate';
import {
  emailScanSchema,
  updateDetectionStatusSchema,
} from '../../shared/schemas/detection.schema';
import { ZodError } from 'zod';
import { queueEmailScan, queueTransactionSync, getJobStatus } from '../../jobs/queue';

/**
 * Register detection routes
 */
export async function detectionRoutes(app: FastifyInstance): Promise<void> {
  // All detection routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * POST /detection/scan/email
   * Scan emails for subscriptions (async with job queue)
   */
  app.post('/detection/scan/email', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      // Validate request body
      const body = emailScanSchema.parse(request.body);

      // Get user's connected Gmail account
      const connectedAccount = await getConnectedEmailAccount(request.user.userId);

      if (!connectedAccount) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No email account connected. Please connect Gmail first.',
        });
      }

      // Queue email scan job (async processing)
      const jobId = await queueEmailScan({
        userId: request.user.userId,
        accessToken: connectedAccount.accessToken,
        refreshToken: connectedAccount.refreshToken,
        maxEmails: body.maxEmails,
        daysBack: body.daysBack,
        deepScan: body.deepScan,
      });

      return reply.status(202).send({
        message: 'Email scan started',
        jobId,
        queue: 'email-scan',
        statusUrl: `/api/detection/jobs/email-scan/${jobId}`,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid scan parameters',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Email scan failed';
      request.log.error({ error }, 'Email scan error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });

  /**
   * POST /detection/scan/bank
   * Scan bank transactions for recurring patterns (async with job queue)
   */
  app.post('/detection/scan/bank', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { daysBack, connectedAccountId } = request.body as { daysBack?: number; connectedAccountId?: string };

      // Default to first connected bank account if not specified
      let accountId = connectedAccountId;
      if (!accountId) {
        const { db } = await import('../../config/database');
        const result = await db.query(
          `SELECT id FROM connected_accounts
           WHERE user_id = $1 AND account_type = 'bank' AND status = 'active'
           LIMIT 1`,
          [request.user.userId]
        );

        if (result.rows.length === 0) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'No bank account connected.',
          });
        }

        accountId = result.rows[0].id;
      }

      // Queue transaction sync job (async processing)
      const jobId = await queueTransactionSync({
        userId: request.user.userId,
        connectedAccountId: accountId!,
        daysBack: daysBack || 365,
      });

      return reply.status(202).send({
        message: 'Bank transaction sync started',
        jobId,
        queue: 'transaction-sync',
        statusUrl: `/api/detection/jobs/transaction-sync/${jobId}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bank scan failed';
      request.log.error({ error }, 'Bank scan error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });

  /**
   * GET /detection/jobs/:queue/:jobId
   * Get job status and progress
   */
  app.get('/detection/jobs/:queue/:jobId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { queue, jobId } = request.params as { queue: string; jobId: string };

      const jobStatus = await getJobStatus(queue, jobId);

      if (!jobStatus) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Job not found',
        });
      }

      return reply.send(jobStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get job status';
      request.log.error({ error }, 'Get job status error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  });

  /**
   * GET /detection/results
   * Get detection results
   */
  app.get('/detection/results', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { status } = request.query as { status?: string };

      const detections = await detectionService.getDetections(request.user.userId, status);

      return reply.send(detections);
    } catch (error) {
      request.log.error({ error }, 'Get detections error');

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch detections',
      });
    }
  });

  /**
   * POST /detection/:id/import
   * Import a detection as a subscription
   */
  app.post('/detection/:id/import', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };

      await detectionService.importDetection(request.user.userId, id);

      return reply.send({
        message: 'Detection imported successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      request.log.error({ error }, 'Import detection error');

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
   * PATCH /detection/:id/status
   * Update detection status (confirm/reject)
   */
  app.patch('/detection/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { id } = request.params as { id: string };
      const body = updateDetectionStatusSchema.parse(request.body);

      await detectionService.updateDetectionStatus(request.user.userId, id, body.status);

      return reply.send({
        message: `Detection ${body.status} successfully`,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid status',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const message = error instanceof Error ? error.message : 'Update status failed';
      request.log.error({ error }, 'Update detection status error');

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

/**
 * Helper function to get connected email account
 * Returns decrypted tokens (in production, implement proper encryption/decryption)
 */
async function getConnectedEmailAccount(
  userId: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const { db } = await import('../../config/database');

  const result = await db.query(
    `SELECT access_token_encrypted, refresh_token_encrypted
     FROM connected_accounts
     WHERE user_id = $1 AND account_type = 'gmail' AND status = 'active'
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // TODO: Implement proper decryption
  // For now, return as-is (tokens should be encrypted in production)
  return {
    accessToken: result.rows[0].access_token_encrypted,
    refreshToken: result.rows[0].refresh_token_encrypted,
  };
}
