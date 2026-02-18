import { Worker, Job } from 'bullmq';
import { appConfig } from '../../config';
import { NotificationEmailJobData } from '../queue.notifications';
import { db } from '../../config/database';
import { Subscription } from '../../db/types';
import {
  generateRenewalReminderEmail,
  generateScanCompletedEmail,
  generatePriceChangeEmail,
  generateBudgetAlertEmail,
} from '../../modules/notifications/email-templates';

/**
 * Notification Email Worker
 * Processes email notification sending asynchronously
 * Uses preserved email templates from original implementation
 */

const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  password: appConfig.redis.password || undefined,
  maxRetriesPerRequest: null,
};

export interface NotificationEmailResult {
  notificationId: string;
  emailSent: boolean;
  recipient: string;
}

async function processNotificationEmail(
  job: Job<NotificationEmailJobData>
): Promise<NotificationEmailResult> {
  const { notificationId, userId, type, metadata } = job.data;

  console.log(`[Notification Email Worker] Processing notification ${notificationId} for user ${userId}`);

  try {
    // Get user email
    const userResult = await db.query<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];
    let emailData: { subject: string; html: string } | null = null;

    // Generate email based on notification type
    switch (type) {
      case 'renewal_reminder': {
        // Get subscription details
        const subResult = await db.query<Subscription>(
          'SELECT * FROM subscriptions WHERE id = $1',
          [metadata.subscriptionId]
        );

        if (subResult.rows.length === 0) {
          throw new Error('Subscription not found');
        }

        emailData = generateRenewalReminderEmail(
          subResult.rows[0],
          metadata.daysUntilRenewal
        );
        break;
      }

      case 'scan_completed': {
        emailData = generateScanCompletedEmail(metadata.detected, metadata.autoImported || 0);
        break;
      }

      case 'price_change': {
        emailData = generatePriceChangeEmail(
          metadata.subscriptionName,
          metadata.oldAmount,
          metadata.newAmount,
          metadata.currency
        );
        break;
      }

      case 'budget_alert': {
        emailData = generateBudgetAlertEmail(
          metadata.budgetName,
          metadata.spent,
          metadata.limit,
          metadata.currency
        );
        break;
      }

      default:
        console.log(`[Notification Email Worker] Unsupported notification type: ${type}`);
        return {
          notificationId,
          emailSent: false,
          recipient: user.email,
        };
    }

    if (!emailData) {
      return {
        notificationId,
        emailSent: false,
        recipient: user.email,
      };
    }

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just log the email
    console.log(`[Notification Email Worker] Email ready to send:`);
    console.log(`  To: ${user.email}`);
    console.log(`  Subject: ${emailData.subject}`);
    console.log(`  HTML length: ${emailData.html.length} characters`);

    // In production, send email here:
    // await sendEmail({
    //   to: user.email,
    //   subject: emailData.subject,
    //   html: emailData.html,
    // });

    // Update notification status
    await db.query(
      `UPDATE notifications
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [notificationId]
    );

    console.log(`[Notification Email Worker] Notification ${notificationId} processed successfully`);

    return {
      notificationId,
      emailSent: true,
      recipient: user.email,
    };
  } catch (error) {
    console.error(`[Notification Email Worker] Error processing notification ${notificationId}:`, error);

    // Update notification status to failed
    await db.query(
      `UPDATE notifications
       SET status = 'failed'
       WHERE id = $1`,
      [notificationId]
    );

    throw error;
  }
}

// Create and start worker
export const notificationEmailWorker = new Worker<NotificationEmailJobData, NotificationEmailResult>(
  'notification-email',
  processNotificationEmail,
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 emails concurrently
  }
);

notificationEmailWorker.on('completed', (job, result) => {
  console.log(`[Notification Email Worker] Job ${job.id} completed: ${result.emailSent ? 'sent' : 'skipped'}`);
});

notificationEmailWorker.on('failed', (job, error) => {
  console.error(`[Notification Email Worker] Job ${job?.id} failed:`, error);
});

notificationEmailWorker.on('error', (error) => {
  console.error('[Notification Email Worker] Worker error:', error);
});

console.log('✅ Notification Email Worker started');
