import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../../app';
import { FastifyInstance } from 'fastify';
import { db } from '../../config/database';

describe('Authentication API', () => {
  let app: FastifyInstance;
  let dbAvailable = false;

  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'Test1234!',
    name: 'Test User',
  };

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    app = await createApp({ logger: false });

    // Check if database is available
    db.connect();
    dbAvailable = await db.testConnection();

    if (!dbAvailable) {
      console.warn('⚠️  PostgreSQL not available. Skipping auth tests.');
      console.warn('   Start PostgreSQL with: docker compose up -d');
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      // Clean up test user before each test
      await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      // Clean up test data
      await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
      await db.disconnect();
    }
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it.skipIf(!dbAvailable)('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: testUser,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('tokens');
      expect(body.user.email).toBe(testUser.email);
      expect(body.user.name).toBe(testUser.name);
      expect(body.user).not.toHaveProperty('password_hash');
      expect(body.tokens).toHaveProperty('accessToken');
      expect(body.tokens).toHaveProperty('refreshToken');

      // Save tokens for later tests
      accessToken = body.tokens.accessToken;
      refreshToken = body.tokens.refreshToken;
    });

    it.skipIf(!dbAvailable)('should reject duplicate email', async () => {
      // Register first user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: testUser,
      });

      // Try to register again
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: testUser,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Conflict');
    });

    it('should reject invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'Test1234!',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'weak',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      if (dbAvailable) {
        // Register a test user before login tests
        await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: testUser,
        });
      }
    });

    it.skipIf(!dbAvailable)('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('tokens');
      expect(body.user.email).toBe(testUser.email);
      expect(body.tokens).toHaveProperty('accessToken');
      expect(body.tokens).toHaveProperty('refreshToken');

      // Save tokens for later tests
      accessToken = body.tokens.accessToken;
      refreshToken = body.tokens.refreshToken;
    });

    it.skipIf(!dbAvailable)('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it.skipIf(!dbAvailable)('should reject non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Test1234!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      if (dbAvailable) {
        // Register and login to get a token
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: testUser,
        });
        const body = JSON.parse(response.body);
        accessToken = body.tokens.accessToken;
      }
    });

    it.skipIf(!dbAvailable)('should return current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.email).toBe(testUser.email);
      expect(body.name).toBe(testUser.name);
      expect(body).toHaveProperty('id');
      expect(body).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/auth/me', () => {
    beforeEach(async () => {
      if (dbAvailable) {
        // Register and login to get a token
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: testUser,
        });
        const body = JSON.parse(response.body);
        accessToken = body.tokens.accessToken;
      }
    });

    it.skipIf(!dbAvailable)('should update user profile', async () => {
      const updates = {
        name: 'Updated Name',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: updates,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.name).toBe(updates.name);
      expect(body.email).toBe(testUser.email);
    });

    it('should reject update without token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        payload: { name: 'New Name' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      if (dbAvailable) {
        // Register to get a refresh token
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: testUser,
        });
        const body = JSON.parse(response.body);
        refreshToken = body.tokens.refreshToken;
      }
    });

    it.skipIf(!dbAvailable)('should refresh access token with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('expiresIn');

      // New tokens should be different from old ones
      expect(body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      if (dbAvailable) {
        // Register to get a refresh token
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: testUser,
        });
        const body = JSON.parse(response.body);
        refreshToken = body.tokens.refreshToken;
      }
    });

    it.skipIf(!dbAvailable)('should logout successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Logged out successfully');

      // Try to use the same refresh token again
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(refreshResponse.statusCode).toBe(401);
    });

    it('should return success even with invalid token', async () => {
      // Logout should always return success to avoid leaking information
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
