import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { cancellationService } from './cancellation.service';
import { CancellationMethod } from '../../db/types';

// Validation schemas
const draftEmailSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),
  userName: z.string().optional(),
  userEmail: z.string().email().optional(),
  accountId: z.string().optional(),
  reason: z.string().optional(),
  subscriptionDetails: z
    .object({
      planName: z.string().optional(),
      monthlyAmount: z.number().optional(),
      startDate: z.string().optional(),
    })
    .optional(),
});

const initiateCancellationSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  serviceName: z.string().min(1, 'Service name is required'),
  method: z.enum(['online', 'email', 'phone', 'in_app', 'chat']),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
});

const updateCancellationSchema = z.object({
  status: z.string().optional(),
  responseReceived: z.boolean().optional(),
  responseDate: z.string().optional(),
  cancelledSuccessfully: z.boolean().optional(),
  cancellationDate: z.string().optional(),
  refundReceived: z.boolean().optional(),
  refundAmount: z.number().optional(),
  difficultyRating: z.number().min(1).max(5).optional(),
  feedbackNotes: z.string().optional(),
});

/**
 * Cancellation routes
 */
export async function cancellationRoutes(fastify: FastifyInstance) {
  // Get all cancellation guides
  fastify.get('/cancellation/guides', async (request: FastifyRequest, reply: FastifyReply) => {
    const { query, category } = request.query as { query?: string; category?: string };

    const guides = query || category
      ? await cancellationService.searchGuides(query, category)
      : await cancellationService.getAllGuides();

    return reply.status(200).send({
      guides: guides.map((guide) => ({
        id: guide.id,
        serviceName: guide.service_name,
        serviceCategory: guide.service_category,
        difficulty: guide.difficulty,
        estimatedTimeMinutes: guide.estimated_time_minutes,
        cancellationMethods: guide.cancellation_methods,
        primaryMethod: guide.primary_method,
        cancellationUrl: guide.cancellation_url,
        requiresLogin: guide.requires_login,
        supportEmail: guide.support_email,
        supportPhone: guide.support_phone,
        phoneHours: guide.phone_hours,
        steps: guide.steps,
        warnings: guide.warnings,
        tips: guide.tips,
        refundPolicy: guide.refund_policy,
        refundEligibleDays: guide.refund_eligible_days,
        pauseAvailable: guide.pause_available,
        downgradeAvailable: guide.downgrade_available,
        lastVerified: guide.last_verified,
        successRate: guide.success_rate,
        averageResponseTimeHours: guide.average_response_time_hours,
      })),
      count: guides.length,
    });
  });

  // Get specific cancellation guide
  fastify.get<{ Params: { serviceName: string } }>(
    '/cancellation/guides/:serviceName',
    async (request: FastifyRequest<{ Params: { serviceName: string } }>, reply: FastifyReply) => {
      const { serviceName } = request.params;

      const guide = await cancellationService.getGuide(serviceName);

      if (!guide) {
        return reply.status(404).send({
          error: 'Cancellation guide not found',
          message: `No cancellation guide available for ${serviceName}`,
        });
      }

      return reply.status(200).send({
        id: guide.id,
        serviceName: guide.service_name,
        serviceCategory: guide.service_category,
        difficulty: guide.difficulty,
        estimatedTimeMinutes: guide.estimated_time_minutes,
        cancellationMethods: guide.cancellation_methods,
        primaryMethod: guide.primary_method,
        cancellationUrl: guide.cancellation_url,
        requiresLogin: guide.requires_login,
        supportEmail: guide.support_email,
        supportPhone: guide.support_phone,
        phoneHours: guide.phone_hours,
        steps: guide.steps,
        warnings: guide.warnings,
        tips: guide.tips,
        refundPolicy: guide.refund_policy,
        refundEligibleDays: guide.refund_eligible_days,
        pauseAvailable: guide.pause_available,
        downgradeAvailable: guide.downgrade_available,
        lastVerified: guide.last_verified,
        successRate: guide.success_rate,
        averageResponseTimeHours: guide.average_response_time_hours,
      });
    }
  );

  // Draft cancellation email
  fastify.post<{ Body: z.infer<typeof draftEmailSchema> }>(
    '/cancellation/draft-email',
    {
      schema: {
        body: {
          type: 'object',
          required: ['serviceName'],
          properties: {
            serviceName: { type: 'string' },
            userName: { type: 'string' },
            userEmail: { type: 'string' },
            accountId: { type: 'string' },
            reason: { type: 'string' },
            subscriptionDetails: {
              type: 'object',
              properties: {
                planName: { type: 'string' },
                monthlyAmount: { type: 'number' },
                startDate: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof draftEmailSchema> }>, reply: FastifyReply) => {
      const validation = draftEmailSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const { serviceName, userName, userEmail, accountId, reason, subscriptionDetails } =
        validation.data;

      try {
        const email = await cancellationService.draftCancellationEmail({
          serviceName,
          userName,
          userEmail,
          accountId,
          reason,
          subscriptionDetails: subscriptionDetails
            ? {
                ...subscriptionDetails,
                startDate: subscriptionDetails.startDate
                  ? new Date(subscriptionDetails.startDate)
                  : undefined,
              }
            : undefined,
        });

        return reply.status(200).send({
          message: 'Email drafted successfully',
          email,
        });
      } catch (error: any) {
        return reply.status(500).send({
          error: 'Failed to draft email',
          message: error.message,
        });
      }
    }
  );

  // Initiate cancellation
  fastify.post<{ Body: z.infer<typeof initiateCancellationSchema> }>(
    '/cancellation/initiate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['serviceName', 'method'],
          properties: {
            subscriptionId: { type: 'string' },
            serviceName: { type: 'string' },
            method: { type: 'string', enum: ['online', 'email', 'phone', 'in_app', 'chat'] },
            emailSubject: { type: 'string' },
            emailBody: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof initiateCancellationSchema> }>,
      reply: FastifyReply
    ) => {
      const userId = (request as any).userId;

      const validation = initiateCancellationSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const { subscriptionId, serviceName, method, emailSubject, emailBody } = validation.data;

      try {
        const cancellationRequest = await cancellationService.initiateCancellation({
          userId,
          subscriptionId,
          serviceName,
          method: method as CancellationMethod,
          emailSubject,
          emailBody,
        });

        return reply.status(201).send({
          message: 'Cancellation request initiated',
          request: {
            id: cancellationRequest.id,
            serviceName: cancellationRequest.service_name,
            method: cancellationRequest.method_used,
            status: cancellationRequest.status,
            createdAt: cancellationRequest.created_at,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          error: 'Failed to initiate cancellation',
          message: error.message,
        });
      }
    }
  );

  // Get user's cancellation requests
  fastify.get('/cancellation/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const requests = await cancellationService.getUserCancellationRequests(userId);

    return reply.status(200).send({
      requests: requests.map((req) => ({
        id: req.id,
        subscriptionId: req.subscription_id,
        serviceName: req.service_name,
        method: req.method_used,
        status: req.status,
        emailSentAt: req.email_sent_at,
        responseReceived: req.response_received,
        responseDate: req.response_date,
        cancelledSuccessfully: req.cancelled_successfully,
        cancellationDate: req.cancellation_date,
        refundReceived: req.refund_received,
        refundAmount: req.refund_amount,
        difficultyRating: req.difficulty_rating,
        createdAt: req.created_at,
      })),
      count: requests.length,
    });
  });

  // Update cancellation request
  fastify.put<{
    Params: { requestId: string };
    Body: z.infer<typeof updateCancellationSchema>;
  }>(
    '/cancellation/requests/:requestId',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            responseReceived: { type: 'boolean' },
            responseDate: { type: 'string' },
            cancelledSuccessfully: { type: 'boolean' },
            cancellationDate: { type: 'string' },
            refundReceived: { type: 'boolean' },
            refundAmount: { type: 'number' },
            difficultyRating: { type: 'number', minimum: 1, maximum: 5 },
            feedbackNotes: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { requestId: string };
        Body: z.infer<typeof updateCancellationSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as any).userId;
      const { requestId } = request.params;

      const validation = updateCancellationSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: validation.error.issues,
        });
      }

      const updates = validation.data;

      try {
        const updatedRequest = await cancellationService.updateCancellationRequest(
          requestId,
          userId,
          {
            ...updates,
            responseDate: updates.responseDate ? new Date(updates.responseDate) : undefined,
            cancellationDate: updates.cancellationDate
              ? new Date(updates.cancellationDate)
              : undefined,
          }
        );

        return reply.status(200).send({
          message: 'Cancellation request updated',
          request: {
            id: updatedRequest.id,
            status: updatedRequest.status,
            cancelledSuccessfully: updatedRequest.cancelled_successfully,
            updatedAt: updatedRequest.updated_at,
          },
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(500).send({
          error: 'Failed to update cancellation request',
          message: error.message,
        });
      }
    }
  );

  // Get cancellation statistics
  fastify.get('/cancellation/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const stats = await cancellationService.getCancellationStats();

    return reply.status(200).send(stats);
  });
}
