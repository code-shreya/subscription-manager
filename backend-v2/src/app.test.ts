import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from './app';
import { FastifyInstance } from 'fastify';

describe('Fastify App', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    app = await createApp({ logger: false });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      // Accept either 200 (healthy) or 503 (degraded, when DB not available)
      expect([200, 503]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(['healthy', 'degraded']).toContain(body.status);
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('services');
      expect(body.services).toHaveProperty('api');
      expect(body.services).toHaveProperty('database');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Subscription Manager API v2');
      expect(body.version).toBe('2.0.0');
      expect(body).toHaveProperty('documentation');
      expect(body).toHaveProperty('health');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/unknown-route',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
    });
  });
});
