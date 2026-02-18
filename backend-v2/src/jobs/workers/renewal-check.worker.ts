import { Worker, Job } from 'bullmq';
import { appConfig } from '../../config';
import { RenewalCheckJobData } from '../queue';
import { db } from '../../config/database';
import { Subscription } from '../../db/types';

/**
 * Renewal Check Worker
 * Checks for upcoming subscription renewals and sends reminders
 * Replaces node-cron scheduled renewal checks
 */

const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  password: appConfig.redis.password || undefined,
  maxRetriesPerRequest: null,
};

export interface RenewalCheckResult {
  totalChecked: number;
  remindersCreated: number;
  subscriptionsDue: Array<{
    userId: string;
    subscriptionId: string;
    name: string;
    daysUntilRenewal: number;
  }>;
}

async function processRenewalCheck(job: Job<RenewalCheckJobData>): Promise<RenewalCheckResult> {
  const { userId, daysAhead = 30 } = job.data;

  console.log(`[Renewal Check Worker] Checking renewals for next ${daysAhead} days`);
  await job.updateProgress(0);

  try {
    // Get subscriptions that have upcoming renewals
    let query = `
      SELECT s.id, s.user_id, s.name, s.amount, s.currency, s.billing_cycle,
             s.next_billing_date, s.reminder_days_before, u.email, u.name as user_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
        AND s.next_billing_date IS NOT NULL
        AND s.next_billing_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
    `;

    const params: any[] = [];

    if (userId) {
      query += ' AND s.user_id = $1';
      params.push(userId);
    }

    query += ' ORDER BY s.next_billing_date ASC';

    const result = await db.query<Subscription & { email: string; user_name: string }>(query, params);

    await job.updateProgress(30);

    const subscriptions = result.rows;
    let remindersCreated = 0;
    const subscriptionsDue: RenewalCheckResult['subscriptionsDue'] = [];

    console.log(`[Renewal Check Worker] Found ${subscriptions.length} upcoming renewals`);

    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      const nextBillingDate = new Date(subscription.next_billing_date!);
      const today = new Date();
      const daysUntilRenewal = Math.ceil(
        (nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const reminderDays = subscription.reminder_days_before || 3;

      // Check if we should send a reminder
      if (daysUntilRenewal <= reminderDays) {
        // Check if reminder already sent
        const existingReminder = await db.query(
          `SELECT id FROM notifications
           WHERE user_id = $1
             AND notification_type = 'renewal_reminder'
             AND metadata->>'subscriptionId' = $2
             AND created_at >= CURRENT_DATE - INTERVAL '1 day'
           LIMIT 1`,
          [subscription.user_id, subscription.id]
        );

        if (existingReminder.rows.length === 0) {
          // Create notification
          await db.query(
            `INSERT INTO notifications (
              user_id, notification_type, title, message, metadata, status
            )
            VALUES ($1, 'renewal_reminder', $2, $3, $4, 'pending')`,
            [
              subscription.user_id,
              `Upcoming Renewal: ${subscription.name}`,
              `Your ${subscription.name} subscription will renew in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''} on ${nextBillingDate.toLocaleDateString()}. Amount: ${subscription.currency} ${subscription.amount}`,
              JSON.stringify({
                subscriptionId: subscription.id,
                subscriptionName: subscription.name,
                amount: subscription.amount,
                currency: subscription.currency,
                nextBillingDate: subscription.next_billing_date,
                daysUntilRenewal,
              }),
            ]
          );

          remindersCreated++;
          console.log(
            `[Renewal Check Worker] Reminder created for ${subscription.name} (${daysUntilRenewal} days)`
          );
        }

        subscriptionsDue.push({
          userId: subscription.user_id,
          subscriptionId: subscription.id,
          name: subscription.name,
          daysUntilRenewal,
        });
      }

      // Update progress
      const progress = 30 + Math.floor((i / subscriptions.length) * 70);
      await job.updateProgress(progress);
    }

    await job.updateProgress(100);

    console.log(`[Renewal Check Worker] Completed: ${remindersCreated} reminders created`);

    return {
      totalChecked: subscriptions.length,
      remindersCreated,
      subscriptionsDue,
    };
  } catch (error) {
    console.error('[Renewal Check Worker] Fatal error:', error);
    throw error;
  }
}

// Create and start worker
export const renewalCheckWorker = new Worker<RenewalCheckJobData, RenewalCheckResult>(
  'renewal-check',
  processRenewalCheck,
  {
    connection: redisConnection,
    concurrency: 1, // Only one renewal check at a time
  }
);

renewalCheckWorker.on('completed', (job, result) => {
  console.log(
    `[Renewal Check Worker] Job ${job.id} completed: ${result.remindersCreated} reminders created`
  );
});

renewalCheckWorker.on('failed', (job, error) => {
  console.error(`[Renewal Check Worker] Job ${job?.id} failed:`, error);
});

renewalCheckWorker.on('error', (error) => {
  console.error('[Renewal Check Worker] Worker error:', error);
});

console.log('✅ Renewal Check Worker started');
