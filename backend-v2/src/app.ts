import Fastify, { FastifyInstance, FastifyReply, FastifyRequest, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import Redis from 'ioredis';
import { appConfig } from './config';
import { ZodError } from 'zod';

export interface AppOptions {
  logger?: boolean;
}

/**
 * Creates and configures the Fastify application
 */
export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? appConfig.server.isDevelopment,
    disableRequestLogging: appConfig.server.isProduction,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // Register Swagger for API documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Subscription Manager API',
        description: 'Next-generation subscription management system with AI-powered detection',
        version: '2.0.0',
      },
      servers: [
        {
          url: appConfig.server.isDevelopment
            ? `http://localhost:${appConfig.server.port}`
            : 'https://api.submanager.com',
          description: appConfig.server.isDevelopment ? 'Development server' : 'Production server',
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'subscriptions', description: 'Subscription management' },
        { name: 'analytics', description: 'Analytics and reporting' },
        { name: 'bank', description: 'Bank integration and transactions' },
        { name: 'email', description: 'Email integration (Gmail, Outlook)' },
        { name: 'cancellation', description: 'Cancellation assistance and guides' },
        { name: 'family', description: 'Family groups and shared subscriptions' },
        { name: 'recommendations', description: 'AI-powered savings recommendations' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Register security plugins
  await app.register(helmet, {
    contentSecurityPolicy: appConfig.server.isProduction ? undefined : false,
  });

  await app.register(cors, {
    origin: appConfig.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Register WebSocket for real-time updates
  await app.register(websocket, {
    options: {
      maxPayload: 1048576, // 1 MB
    },
  });

  // Register rate limiting (skip Redis in test mode if not available)
  try {
    await app.register(rateLimit, {
      max: appConfig.rateLimit.max,
      timeWindow: appConfig.rateLimit.timeWindow,
      redis: appConfig.server.isTest
        ? undefined // Use in-memory store for tests
        : new Redis({
            host: appConfig.redis.host,
            port: appConfig.redis.port,
            password: appConfig.redis.password || undefined,
          }),
    });
  } catch (error) {
    // In test mode, if Redis fails, continue without rate limiting
    if (!appConfig.server.isTest) {
      throw error;
    }
    app.log.warn('Rate limiting disabled (Redis not available in test mode)');
  }

  // Global error handler
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    // Log error for debugging
    request.log.error(error);

    // Handle different error types
    const statusCode = error.statusCode || 500;
    const message = appConfig.server.isProduction && statusCode === 500
      ? 'Internal Server Error'
      : error.message;

    return reply.status(statusCode).send({
      error: error.name || 'Error',
      message,
      ...(appConfig.server.isDevelopment && { stack: error.stack }),
    });
  });

  // Health check endpoint
  app.get('/health', async (_request, reply) => {
    // Check database status
    let databaseStatus = 'unknown';
    try {
      const { db } = await import('./config/database');
      databaseStatus = db.isReady() ? 'operational' : 'not_connected';
    } catch {
      databaseStatus = 'not_initialized';
    }

    const isHealthy = databaseStatus === 'operational' || databaseStatus === 'not_initialized';
    const statusCode = isHealthy ? 200 : 503;

    return reply.status(statusCode).send({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: appConfig.server.env,
      version: '2.0.0',
      services: {
        api: 'operational',
        database: databaseStatus,
      },
    });
  });

  // Root endpoint
  app.get('/', async (_request, reply) => {
    return reply.status(200).send({
      name: 'Subscription Manager API v2',
      version: '2.0.0',
      description: 'Next-generation subscription management system',
      documentation: '/docs',
      health: '/health',
      endpoints: {
        auth: '/api/auth',
        subscriptions: '/api/subscriptions',
        analytics: '/api/analytics',
        bank: '/api/banks',
        email: '/api/email',
        cancellation: '/api/cancellation',
        family: '/api/family',
        recommendations: '/api/recommendations',
      },
    });
  });

  // Register API routes
  await app.register(
    async (apiApp) => {
      // Import and register auth routes
      const { authRoutes } = await import('./modules/auth/auth.routes');
      await apiApp.register(authRoutes);

      // Import and register subscription routes
      const { subscriptionRoutes } = await import('./modules/subscriptions/subscriptions.routes');
      await apiApp.register(subscriptionRoutes);

      // Import and register analytics routes (enhanced)
      const { enhancedAnalyticsRoutes } = await import('./modules/analytics/analytics.routes.enhanced');
      await apiApp.register(enhancedAnalyticsRoutes);

      // Import and register detection routes
      const { detectionRoutes } = await import('./modules/detection/detection.routes');
      await apiApp.register(detectionRoutes);

      // Import and register notification routes
      const { notificationRoutes } = await import('./modules/notifications/notifications.routes');
      await apiApp.register(notificationRoutes);

      // Import and register budget routes
      const { budgetRoutes } = await import('./modules/budgets/budgets.routes');
      await apiApp.register(budgetRoutes);

      // Import and register bank routes
      const { bankRoutes } = await import('./modules/bank/bank.routes');
      await apiApp.register(bankRoutes);

      // Import and register email routes
      const { emailRoutes } = await import('./modules/email/email.routes');
      await apiApp.register(emailRoutes);

      // Import and register cancellation routes
      const { cancellationRoutes } = await import('./modules/cancellation/cancellation.routes');
      await apiApp.register(cancellationRoutes);

      // Import and register family routes
      const { familyRoutes } = await import('./modules/family/family.routes');
      await apiApp.register(familyRoutes);

      // Import and register recommendations routes
      const { recommendationsRoutes } = await import('./modules/recommendations/recommendations.routes');
      await apiApp.register(recommendationsRoutes);
    },
    { prefix: '/api' }
  );

  // Register WebSocket routes
  const { registerWebSocketRoutes } = await import('./jobs/websocket.service');
  registerWebSocketRoutes(app);

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
