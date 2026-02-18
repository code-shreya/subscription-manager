import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { appConfig } from '../../config';

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
}

/**
 * Generate JWT access token (short-lived)
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.accessExpiration,
    issuer: 'submanager-api',
    audience: 'submanager-app',
  } as any);
}

/**
 * Generate JWT refresh token (long-lived)
 */
export function generateRefreshToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.refreshExpiration,
    jwtid: crypto.randomUUID(),
    issuer: 'submanager-api',
    audience: 'submanager-app',
  } as any);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret, {
      issuer: 'submanager-api',
      audience: 'submanager-app',
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Get token expiration timestamp
 */
export function getTokenExpiration(expiresIn: string): Date {
  const now = new Date();

  // Parse expiration string (e.g., "15m", "7d")
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit) {
    case 's':
      return new Date(now.getTime() + numValue * 1000);
    case 'm':
      return new Date(now.getTime() + numValue * 60 * 1000);
    case 'h':
      return new Date(now.getTime() + numValue * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() + numValue * 24 * 60 * 60 * 1000);
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}
