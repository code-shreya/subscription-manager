import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { emailService } from './email.service';

// Validation schemas
const connectEmailSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

const scanEmailsSchema = z.object({
  maxResults: z.coerce.number().min(1).max(500).optional().default(50),
  daysBack: z.coerce.number().min(1).max(365).optional().default(90),
  deep: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

/**
 * Email routes
 */
export async function emailRoutes(fastify: FastifyInstance) {
  // Get available email providers
  fastify.get('/email/providers', async (_request: FastifyRequest, reply: FastifyReply) => {
    const providers = emailService.getAvailableProviders();

    return reply.status(200).send({
      providers,
    });
  });

  // Get Gmail OAuth URL
  fastify.get('/email/gmail/auth-url', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUrl = emailService.getAuthUrl('gmail');

      return reply.status(200).send({
        authUrl,
        provider: 'gmail',
      });
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message,
      });
    }
  });

  // Gmail OAuth callback
  fastify.post<{ Body: z.infer<typeof connectEmailSchema> }>(
    '/email/gmail/callback',
    {
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof connectEmailSchema> }>, reply: FastifyReply) => {
      const userId = (request as any).userId;

      const validation = connectEmailSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const { code } = validation.data;

      try {
        const result = await emailService.connectEmail(userId, 'gmail', code);

        return reply.status(201).send({
          message: 'Gmail connected successfully',
          ...result,
        });
      } catch (error: any) {
        return reply.status(400).send({
          error: error.message,
        });
      }
    }
  );

  // Get Outlook OAuth URL
  fastify.get('/email/outlook/auth-url', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUrl = emailService.getAuthUrl('outlook');

      return reply.status(200).send({
        authUrl,
        provider: 'outlook',
      });
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message,
      });
    }
  });

  // Outlook OAuth callback
  fastify.post<{ Body: z.infer<typeof connectEmailSchema> }>(
    '/email/outlook/callback',
    {
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof connectEmailSchema> }>, reply: FastifyReply) => {
      const userId = (request as any).userId;

      const validation = connectEmailSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const { code } = validation.data;

      try {
        const result = await emailService.connectEmail(userId, 'outlook', code);

        return reply.status(201).send({
          message: 'Outlook connected successfully',
          ...result,
        });
      } catch (error: any) {
        return reply.status(400).send({
          error: error.message,
        });
      }
    }
  );

  // Get all email connections
  fastify.get('/email/connections', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const connections = await emailService.getEmailConnections(userId);

    return reply.status(200).send({
      connections: connections.map((conn) => ({
        id: conn.id,
        provider: conn.account_type,
        email: conn.account_identifier,
        displayName: conn.display_name,
        status: conn.status,
        lastSyncedAt: conn.last_synced_at,
        metadata: conn.metadata,
        createdAt: conn.created_at,
      })),
    });
  });

  // Get specific email connection
  fastify.get<{ Params: { accountId: string } }>(
    '/email/connections/:accountId',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      const account = await emailService.getConnectedAccount(userId, accountId);

      if (!account) {
        return reply.status(404).send({ error: 'Email account not found' });
      }

      return reply.status(200).send({
        id: account.id,
        provider: account.account_type,
        email: account.account_identifier,
        displayName: account.display_name,
        status: account.status,
        lastSyncedAt: account.last_synced_at,
        syncFrequencyHours: account.sync_frequency_hours,
        metadata: account.metadata,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      });
    }
  );

  // Check authentication status
  fastify.get<{ Params: { accountId: string } }>(
    '/email/connections/:accountId/status',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        const status = await emailService.checkAuthStatus(userId, accountId);

        return reply.status(200).send(status);
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Scan emails for subscriptions
  fastify.post<{
    Params: { accountId: string };
    Body: z.infer<typeof scanEmailsSchema>;
  }>(
    '/email/connections/:accountId/scan',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', minimum: 1, maximum: 500 },
            daysBack: { type: 'number', minimum: 1, maximum: 365 },
            deep: { type: 'boolean' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { accountId: string };
        Body: z.infer<typeof scanEmailsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      const validation = scanEmailsSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const { maxResults, daysBack, deep } = validation.data;

      try {
        const emails = await emailService.scanEmails(
          userId,
          accountId,
          { maxResults, daysBack, deep }
        );

        return reply.status(200).send({
          message: 'Email scan completed',
          emailsFound: emails.length,
          emails,
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message.includes('not authenticated')) {
          return reply.status(401).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Refresh access token
  fastify.post<{ Params: { accountId: string } }>(
    '/email/connections/:accountId/refresh',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        await emailService.refreshAccessToken(userId, accountId);

        return reply.status(200).send({
          message: 'Access token refreshed successfully',
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Disconnect email account
  fastify.delete<{ Params: { accountId: string } }>(
    '/email/connections/:accountId',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        await emailService.disconnectEmail(userId, accountId);

        return reply.status(200).send({
          message: 'Email account disconnected successfully',
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );
}
