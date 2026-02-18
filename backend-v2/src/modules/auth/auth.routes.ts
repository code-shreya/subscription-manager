import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import { authenticate } from '../../shared/middleware/authenticate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
} from '../../shared/schemas/auth.schema';
import { ZodError } from 'zod';

/**
 * Register authentication routes
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Health check for auth module
  app.get('/auth/health', async (_request, reply) => {
    return reply.send({ status: 'ok', module: 'auth' });
  });

  /**
   * POST /auth/register
   * Register a new user
   */
  app.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body with Zod
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);

      return reply.status(201).send(result);
    } catch (error) {
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

      const message = error instanceof Error ? error.message : 'Registration failed';

      // Check for specific error types
      if (message.includes('already exists')) {
        return reply.status(409).send({
          error: 'Conflict',
          message,
        });
      }

      request.log.error({ error }, 'Registration error');

      return reply.status(400).send({
        error: 'Bad Request',
        message,
      });
    }
  });

  /**
   * POST /auth/login
   * Login user
   */
  app.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body with Zod
      const body = loginSchema.parse(request.body);

      // Collect device info
      const deviceInfo = {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      };

      const result = await authService.login(body, deviceInfo);

      return reply.send(result);
    } catch (error) {
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

      const message = error instanceof Error ? error.message : 'Login failed';

      request.log.error({ error }, 'Login error');

      return reply.status(401).send({
        error: 'Unauthorized',
        message,
      });
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  app.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body with Zod
      const body = refreshTokenSchema.parse(request.body);
      const tokens = await authService.refreshAccessToken(body.refreshToken);

      return reply.send(tokens);
    } catch (error) {
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

      const message = error instanceof Error ? error.message : 'Token refresh failed';

      request.log.error({ error }, 'Token refresh error');

      return reply.status(401).send({
        error: 'Unauthorized',
        message,
      });
    }
  });

  /**
   * POST /auth/logout
   * Logout user by revoking refresh token
   */
  app.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body with Zod
      const body = refreshTokenSchema.parse(request.body);
      await authService.logout(body.refreshToken);

      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      request.log.error({ error }, 'Logout error');

      // Even if logout fails, we return success to avoid leaking information
      return reply.send({ message: 'Logged out successfully' });
    }
  });

  /**
   * GET /auth/me
   * Get current user information (protected route)
   */
  app.get('/auth/me', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const user = await authService.getCurrentUser(request.user.userId);

      return reply.send(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user';

      request.log.error({ error }, 'Get current user error');

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
   * PATCH /auth/me
   * Update current user profile (protected route)
   */
  app.patch('/auth/me', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      // Validate request body with Zod
      const body = updateProfileSchema.parse(request.body);
      const user = await authService.updateProfile(request.user.userId, body);

      return reply.send(user);
    } catch (error) {
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

      const message = error instanceof Error ? error.message : 'Failed to update profile';

      request.log.error({ error }, 'Update profile error');

      return reply.status(400).send({
        error: 'Bad Request',
        message,
      });
    }
  });
}
