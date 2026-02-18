import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, withTransaction } from './database';

describe('Database Connection', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    db.connect();
    // Check if database is available
    dbAvailable = await db.testConnection();
    if (!dbAvailable) {
      console.warn('⚠️  PostgreSQL not available. Skipping database tests.');
      console.warn('   Start PostgreSQL with: docker compose up -d');
    }
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('should connect to the database', () => {
    expect(db.getPool()).toBeDefined();
  });

  it.skipIf(!dbAvailable)('should execute a simple query', async () => {
    const result = await db.query('SELECT 1 as number');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].number).toBe(1);
  });

  it.skipIf(!dbAvailable)('should test connection successfully', async () => {
    const isConnected = await db.testConnection();
    expect(isConnected).toBe(true);
  });

  it.skipIf(!dbAvailable)('should handle transactions', async () => {
    const result = await withTransaction(async (client) => {
      const res = await client.query('SELECT 2 as number');
      return res.rows[0].number;
    });

    expect(result).toBe(2);
  });

  it.skipIf(!dbAvailable)('should rollback transaction on error', async () => {
    await expect(
      withTransaction(async (client) => {
        await client.query('SELECT 1');
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');
  });
});
