/**
 * Worker Process Entry Point
 * Starts all BullMQ workers for background job processing
 * Run separately from main server: npm run workers
 */

import './jobs/workers/email-scan.worker';
import './jobs/workers/renewal-check.worker';
import './jobs/workers/transaction-sync.worker';
import './jobs/workers/notification-email.worker';
import './jobs/workers/budget-check.worker';
import { initializeScheduledJobs } from './jobs/scheduler';
import { initializeQueueEventListeners } from './jobs/websocket.service';

async function startWorkers() {
  console.log('🚀 Starting BullMQ workers...');

  try {
    // Initialize scheduled jobs (recurring jobs)
    await initializeScheduledJobs();

    // Initialize queue event listeners for WebSocket broadcasting
    initializeQueueEventListeners();

    console.log('✅ All workers and scheduled jobs initialized');
    console.log('📊 Workers are now processing jobs from Redis queues');
  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down workers gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down workers gracefully...');
  process.exit(0);
});

// Start workers
startWorkers();
