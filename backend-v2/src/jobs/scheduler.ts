import { renewalCheckQueue, budgetCheckQueue } from './queue';

/**
 * Job Scheduler
 * Configures recurring jobs using BullMQ repeatable jobs
 * Replaces node-cron from original implementation
 */

/**
 * Schedule daily renewal check (runs every day at 9 AM)
 */
export async function scheduleRenewalChecks(): Promise<void> {
  await renewalCheckQueue.add(
    'daily-renewal-check',
    {
      daysAhead: 30, // Check renewals for next 30 days
    },
    {
      repeat: {
        pattern: '0 9 * * *', // Cron: Every day at 9 AM
      },
      jobId: 'renewal-check-daily',
    }
  );

  console.log('⏰ Scheduled daily renewal checks at 9:00 AM');
}

/**
 * Schedule daily budget check (runs every day at 10 AM)
 */
export async function scheduleBudgetChecks(): Promise<void> {
  await budgetCheckQueue.add(
    'daily-budget-check',
    {}, // Check all users
    {
      repeat: {
        pattern: '0 10 * * *', // Cron: Every day at 10 AM
      },
      jobId: 'budget-check-daily',
    }
  );

  console.log('⏰ Scheduled daily budget checks at 10:00 AM');
}

/**
 * Schedule weekly cleanup of old completed jobs
 */
export async function scheduleJobCleanup(): Promise<void> {
  // This is handled automatically by BullMQ's removeOnComplete/removeOnFail options
  // but we can add additional cleanup logic here if needed
  console.log('✅ Automatic job cleanup configured via BullMQ options');
}

/**
 * Initialize all scheduled jobs
 */
export async function initializeScheduledJobs(): Promise<void> {
  try {
    await scheduleRenewalChecks();
    await scheduleBudgetChecks();
    await scheduleJobCleanup();

    console.log('✅ All scheduled jobs initialized');
  } catch (error) {
    console.error('❌ Failed to initialize scheduled jobs:', error);
    throw error;
  }
}

/**
 * Remove all repeatable jobs (useful for testing or reconfiguration)
 */
export async function removeAllRepeatableJobs(): Promise<void> {
  try {
    const renewalJobs = await renewalCheckQueue.getRepeatableJobs();
    const budgetJobs = await budgetCheckQueue.getRepeatableJobs();

    for (const job of renewalJobs) {
      await renewalCheckQueue.removeRepeatableByKey(job.key);
      console.log(`Removed repeatable job: ${job.name}`);
    }

    for (const job of budgetJobs) {
      await budgetCheckQueue.removeRepeatableByKey(job.key);
      console.log(`Removed repeatable job: ${job.name}`);
    }

    console.log('✅ All repeatable jobs removed');
  } catch (error) {
    console.error('❌ Failed to remove repeatable jobs:', error);
    throw error;
  }
}

/**
 * Get status of all scheduled jobs
 */
export async function getScheduledJobsStatus(): Promise<any> {
  try {
    const renewalJobs = await renewalCheckQueue.getRepeatableJobs();
    const budgetJobs = await budgetCheckQueue.getRepeatableJobs();

    const allJobs = [
      ...renewalJobs.map((job) => ({ ...job, queue: 'renewal-check' })),
      ...budgetJobs.map((job) => ({ ...job, queue: 'budget-check' })),
    ];

    return {
      totalScheduled: allJobs.length,
      jobs: allJobs.map((job) => ({
        queue: job.queue,
        name: job.name,
        pattern: job.pattern,
        next: job.next,
        key: job.key,
      })),
    };
  } catch (error) {
    console.error('❌ Failed to get scheduled jobs status:', error);
    throw error;
  }
}
