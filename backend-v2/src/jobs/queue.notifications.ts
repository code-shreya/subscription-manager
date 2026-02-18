import { Queue, QueueEvents } from 'bullmq';
import { appConfig } from '../config';

/**
 * Notification Queue
 * Handles async email sending
 */

export interface NotificationEmailJobData {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
}

// Redis connection options
const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  password: appConfig.redis.password || undefined,
  maxRetriesPerRequest: null,
};

// Notification email queue
export const notificationEmailQueue = new Queue<NotificationEmailJobData>('notification-email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 604800, // 7 days
      count: 50,
    },
  },
});

// Queue events
export const notificationEmailQueueEvents = new QueueEvents('notification-email', {
  connection: redisConnection,
});

/**
 * Queue notification email job
 */
export async function queueNotificationEmail(data: NotificationEmailJobData): Promise<string> {
  const job = await notificationEmailQueue.add('send-notification-email', data, {
    jobId: `notification-email-${data.notificationId}-${Date.now()}`,
  });
  return job.id!;
}
