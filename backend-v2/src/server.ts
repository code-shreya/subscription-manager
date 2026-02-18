import { createApp } from './app';
import { appConfig } from './config';
import { db } from './config/database';

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize database connection
    console.log('Connecting to database...');
    db.connect();

    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.warn('⚠️  Database connection failed. Starting server anyway...');
    } else {
      console.log('✅ Database connected successfully');
    }

    // Create and start Fastify app
    const app = await createApp({ logger: true });

    await app.listen({
      port: appConfig.server.port,
      host: appConfig.server.host,
    });

    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}, closing server gracefully...`);
        await app.close();
        await db.disconnect();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    await db.disconnect();
    process.exit(1);
  }
}

// Start the server
start();
