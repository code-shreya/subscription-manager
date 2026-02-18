import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { appConfig } from './index';

/**
 * PostgreSQL connection pool
 */
class Database {
  private pool: Pool | null = null;
  private isConnected = false;

  /**
   * Initialize the database connection pool
   */
  connect(): void {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      host: appConfig.database.host,
      port: appConfig.database.port,
      database: appConfig.database.database,
      user: appConfig.database.user,
      password: appConfig.database.password,
      min: appConfig.database.min,
      max: appConfig.database.max,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
      this.isConnected = false;
    });

    // Handle pool connection
    this.pool.on('connect', () => {
      this.isConnected = true;
    });

    console.log('Database pool initialized');
  }

  /**
   * Get the connection pool
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const pool = this.getPool();
    const start = Date.now();

    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (appConfig.server.isDevelopment) {
        console.log('Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
      }

      return result;
    } catch (error) {
      console.error('Database query error:', { text, error });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    const pool = this.getPool();
    return pool.connect();
  }

  /**
   * Test the database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if database is connected
   */
  isReady(): boolean {
    return this.isConnected && this.pool !== null;
  }

  /**
   * Close the database connection pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Database pool closed');
    }
  }
}

// Export singleton instance
export const db = new Database();

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
