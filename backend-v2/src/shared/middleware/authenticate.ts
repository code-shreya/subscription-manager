import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, TokenPayload } from '../utils/jwt';

// Extend FastifyRequest to include user information
declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user information to request
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
    }

    // Check if it's a Bearer token
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Expected: Bearer <token>',
      });
    }

    const token = parts[1];

    // Verify token
    try {
      const payload = verifyToken(token);

      // Attach user information to request
      request.user = payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid token';

      return reply.status(401).send({
        error: 'Unauthorized',
        message,
      });
    }
  } catch (error) {
    request.log.error({ error }, 'Authentication error');

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user information if token is valid, but doesn't reject unauthenticated requests
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');

      if (parts.length === 2 && parts[0] === 'Bearer') {
        try {
          const payload = verifyToken(parts[1]);
          request.user = payload;
        } catch {
          // Silently fail for optional auth
        }
      }
    }
  } catch {
    // Silently fail for optional auth
  }
}
