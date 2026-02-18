import { Queue, QueueEvents } from 'bullmq';
import { appConfig } from '../config';

/**
 * Job Queue Infrastructure
 * Manages all background jobs with BullMQ
 */

// Redis connection options for BullMQ
const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  password: appConfig.redis.password || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Job type definitions
export interface EmailScanJobData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  maxEmails?: number;
  daysBack?: number;
  deepScan?: boolean;
}

export interface RenewalCheckJobData {
  userId?: string; // If undefined, checks for all users
  daysAhead?: number;
}

export interface TransactionSyncJobData {
  userId: string;
  connectedAccountId: string;
  daysBack?: number;
}

export interface BudgetCheckJobData {
  userId?: string; // If undefined, checks all users
}

// Queue definitions
export const emailScanQueue = new Queue<EmailScanJobData>('email-scan', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 50,
    },
  },
});

export const renewalCheckQueue = new Queue<RenewalCheckJobData>('renewal-check', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: {
      age: 86400,
      count: 50,
    },
  },
});

export const transactionSyncQueue = new Queue<TransactionSyncJobData>('transaction-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400,
      count: 100,
    },
  },
});

export const budgetCheckQueue = new Queue<BudgetCheckJobData>('budget-check', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: {
      age: 86400,
      count: 50,
    },
  },
});

// Queue events for monitoring
export const emailScanQueueEvents = new QueueEvents('email-scan', {
  connection: redisConnection,
});

export const renewalCheckQueueEvents = new QueueEvents('renewal-check', {
  connection: redisConnection,
});

export const transactionSyncQueueEvents = new QueueEvents('transaction-sync', {
  connection: redisConnection,
});

export const budgetCheckQueueEvents = new QueueEvents('budget-check', {
  connection: redisConnection,
});

/**
 * Add email scan job to queue
 */
export async function queueEmailScan(data: EmailScanJobData): Promise<string> {
  const job = await emailScanQueue.add('scan-emails', data, {
    jobId: `email-scan-${data.userId}-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Add renewal check job to queue
 */
export async function queueRenewalCheck(data: RenewalCheckJobData = {}): Promise<string> {
  const job = await renewalCheckQueue.add('check-renewals', data, {
    jobId: `renewal-check-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Add transaction sync job to queue
 */
export async function queueTransactionSync(data: TransactionSyncJobData): Promise<string> {
  const job = await transactionSyncQueue.add('sync-transactions', data, {
    jobId: `transaction-sync-${data.userId}-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Add budget check job to queue
 */
export async function queueBudgetCheck(data: BudgetCheckJobData = {}): Promise<string> {
  const job = await budgetCheckQueue.add('check-budgets', data, {
    jobId: `budget-check-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Get job status and progress
 */
export async function getJobStatus(queueName: string, jobId: string) {
  let queue: Queue;
  switch (queueName) {
    case 'email-scan':
      queue = emailScanQueue;
      break;
    case 'renewal-check':
      queue = renewalCheckQueue;
      break;
    case 'transaction-sync':
      queue = transactionSyncQueue;
      break;
    case 'budget-check':
      queue = budgetCheckQueue;
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    emailScanQueue.close(),
    renewalCheckQueue.close(),
    transactionSyncQueue.close(),
    budgetCheckQueue.close(),
    emailScanQueueEvents.close(),
    renewalCheckQueueEvents.close(),
    transactionSyncQueueEvents.close(),
    budgetCheckQueueEvents.close(),
  ]);
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('Closing job queues...');
  await closeQueues();
  process.exit(0);
});
