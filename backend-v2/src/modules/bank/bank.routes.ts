import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { bankService } from './bank.service';

// Validation schemas
const connectBankSchema = z.object({
  bankId: z.string().min(1, 'Bank ID is required'),
});

const getBankTransactionsSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
});

/**
 * Bank routes
 */
export async function bankRoutes(fastify: FastifyInstance) {
  // Get supported banks
  fastify.get('/banks', async (_request: FastifyRequest, reply: FastifyReply) => {
    const banks = await bankService.getSupportedBanks();

    return reply.status(200).send({
      banks,
      provider: process.env.USE_PRODUCTION_BANK_PROVIDER === 'true' ? 'account-aggregator' : 'mock',
    });
  });

  // Connect to a bank
  fastify.post<{ Body: z.infer<typeof connectBankSchema> }>(
    '/banks/connect',
    {
      schema: {
        body: {
          type: 'object',
          required: ['bankId'],
          properties: {
            bankId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof connectBankSchema> }>, reply: FastifyReply) => {
      const userId = (request as any).userId;

      const validation = connectBankSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const { bankId } = validation.data;

      try {
        const result = await bankService.connectBank(userId, bankId);

        return reply.status(201).send({
          message: 'Bank connection initiated',
          ...result,
        });
      } catch (error: any) {
        if (error.message.includes('Already connected')) {
          return reply.status(409).send({ error: error.message });
        }
        if (error.message.includes('not supported')) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Get all bank connections
  fastify.get('/banks/connections', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const connections = await bankService.getBankConnections(userId);

    return reply.status(200).send({
      connections: connections.map((conn) => ({
        id: conn.id,
        bankName: conn.display_name,
        accountIdentifier: conn.account_identifier,
        status: conn.status,
        lastSyncedAt: conn.last_synced_at,
        metadata: conn.metadata,
        createdAt: conn.created_at,
      })),
    });
  });

  // Get specific bank connection
  fastify.get<{ Params: { accountId: string } }>(
    '/banks/connections/:accountId',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      const account = await bankService.getConnectedAccount(userId, accountId);

      if (!account) {
        return reply.status(404).send({ error: 'Bank connection not found' });
      }

      return reply.status(200).send({
        id: account.id,
        bankName: account.display_name,
        accountIdentifier: account.account_identifier,
        status: account.status,
        lastSyncedAt: account.last_synced_at,
        syncFrequencyHours: account.sync_frequency_hours,
        metadata: account.metadata,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      });
    }
  );

  // Get consent status
  fastify.get<{ Params: { accountId: string } }>(
    '/banks/connections/:accountId/consent',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        const consentStatus = await bankService.getConsentStatus(userId, accountId);

        return reply.status(200).send(consentStatus);
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Sync bank data (manual trigger)
  fastify.post<{ Params: { accountId: string } }>(
    '/banks/connections/:accountId/sync',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        const result = await bankService.syncBankData(userId, accountId);

        return reply.status(200).send({
          message: 'Bank data synced successfully',
          ...result,
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Get bank transactions
  fastify.get<{
    Params: { accountId: string };
    Querystring: z.infer<typeof getBankTransactionsSchema>;
  }>(
    '/banks/connections/:accountId/transactions',
    async (
      request: FastifyRequest<{
        Params: { accountId: string };
        Querystring: z.infer<typeof getBankTransactionsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      const validation = getBankTransactionsSchema.safeParse(request.query);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const { fromDate, toDate, limit, offset } = validation.data;

      const options = {
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        limit,
        offset,
      };

      try {
        const result = await bankService.getBankTransactions(userId, accountId, options);

        return reply.status(200).send({
          transactions: result.transactions.map((txn) => ({
            id: txn.id,
            transactionId: txn.transaction_id,
            date: txn.transaction_date,
            description: txn.description,
            amount: txn.amount,
            currency: txn.currency,
            type: txn.transaction_type,
            category: txn.category,
            merchantName: txn.merchant_name,
            isRecurring: txn.is_recurring,
            subscriptionId: txn.subscription_id,
          })),
          total: result.total,
          limit,
          offset,
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Detect recurring subscriptions from transactions
  fastify.get<{ Params: { accountId: string } }>(
    '/banks/connections/:accountId/recurring',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        const recurring = await bankService.detectRecurringSubscriptions(userId, accountId);

        return reply.status(200).send({
          recurring,
          count: recurring.length,
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Detect UPI mandates
  fastify.get<{ Params: { accountId: string } }>(
    '/banks/connections/:accountId/mandates',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        const mandates = await bankService.detectUpiMandates(userId, accountId);

        return reply.status(200).send({
          mandates,
          count: mandates.length,
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Disconnect bank
  fastify.delete<{ Params: { accountId: string } }>(
    '/banks/connections/:accountId',
    async (request: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { accountId } = request.params;

      try {
        await bankService.disconnectBank(userId, accountId);

        return reply.status(200).send({
          message: 'Bank disconnected successfully',
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
