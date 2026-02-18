import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  getTokenExpiration,
} from './jwt';

describe('JWT Utils', () => {
  const userId = 'test-user-id';
  const email = 'test@example.com';

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(userId, email);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should include user information in token', () => {
      const token = generateAccessToken(userId, email);
      const decoded = decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(userId, email);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateAccessToken(userId, email);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.iss).toBe('submanager-api');
      expect(payload.aud).toBe('submanager-app');
    });

    it('should reject an invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('should reject a token with wrong signature', () => {
      const token = generateAccessToken(userId, email);
      const tamperedToken = token.slice(0, -10) + 'tampered123';

      expect(() => verifyToken(tamperedToken)).toThrow('Invalid token');
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', () => {
      const token = generateAccessToken(userId, email);
      const decoded = decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('getTokenExpiration', () => {
    it('should calculate expiration for seconds', () => {
      const now = new Date();
      const expires = getTokenExpiration('30s');

      expect(expires.getTime()).toBeGreaterThan(now.getTime());
      expect(expires.getTime()).toBeLessThan(now.getTime() + 31000);
    });

    it('should calculate expiration for minutes', () => {
      const now = new Date();
      const expires = getTokenExpiration('15m');

      expect(expires.getTime()).toBeGreaterThan(now.getTime());
      expect(expires.getTime()).toBeLessThan(now.getTime() + 16 * 60 * 1000);
    });

    it('should calculate expiration for hours', () => {
      const now = new Date();
      const expires = getTokenExpiration('2h');

      expect(expires.getTime()).toBeGreaterThan(now.getTime());
      expect(expires.getTime()).toBeLessThan(now.getTime() + 3 * 60 * 60 * 1000);
    });

    it('should calculate expiration for days', () => {
      const now = new Date();
      const expires = getTokenExpiration('7d');

      expect(expires.getTime()).toBeGreaterThan(now.getTime());
      expect(expires.getTime()).toBeLessThan(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    });

    it('should throw error for invalid format', () => {
      expect(() => getTokenExpiration('invalid')).toThrow('Invalid expiration format');
    });
  });
});
