import { Worker, Job } from 'bullmq';
import { appConfig } from '../../config';
import { db } from '../../config/database';
import { budgetService } from '../../modules/budgets/budgets.service';

/**
 * Budget Check Worker
 * Periodically checks all user budgets and sends alerts when thresholds are exceeded
 */

const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  password: appConfig.redis.password || undefined,
  maxRetriesPerRequest: null,
};

export interface BudgetCheckJobData {
  userId?: string; // If undefined, checks all users
}

export interface BudgetCheckResult {
  usersChecked: number;
  totalAlerts: number;
  userAlerts: Array<{
    userId: string;
    alertsTriggered: number;
  }>;
}

async function processBudgetCheck(job: Job<BudgetCheckJobData>): Promise<BudgetCheckResult> {
  const { userId } = job.data;

  console.log(`[Budget Check Worker] Starting budget check${userId ? ` for user ${userId}` : ' for all users'}`);

  try {
    let userIds: string[];

    if (userId) {
      // Check specific user
      userIds = [userId];
    } else {
      // Get all users with active budgets
      const result = await db.query<{ user_id: string }>(
        `SELECT DISTINCT user_id FROM budgets WHERE status = 'active'`
      );
      userIds = result.rows.map((row) => row.user_id);
    }

    let totalAlerts = 0;
    const userAlerts: BudgetCheckResult['userAlerts'] = [];

    for (const uid of userIds) {
      try {
        const alerts = await budgetService.checkBudgetAlerts(uid);

        if (alerts.length > 0) {
          totalAlerts += alerts.length;
          userAlerts.push({
            userId: uid,
            alertsTriggered: alerts.length,
          });

          console.log(`[Budget Check Worker] User ${uid}: ${alerts.length} alert(s) triggered`);
        }
      } catch (error) {
        console.error(`[Budget Check Worker] Error checking budgets for user ${uid}:`, error);
        // Continue with next user
      }
    }

    console.log(
      `[Budget Check Worker] Completed: ${userIds.length} users checked, ${totalAlerts} alerts sent`
    );

    return {
      usersChecked: userIds.length,
      totalAlerts,
      userAlerts,
    };
  } catch (error) {
    console.error('[Budget Check Worker] Fatal error:', error);
    throw error;
  }
}

// Create and start worker
export const budgetCheckWorker = new Worker<BudgetCheckJobData, BudgetCheckResult>(
  'budget-check',
  processBudgetCheck,
  {
    connection: redisConnection,
    concurrency: 1, // Process one check at a time
  }
);

budgetCheckWorker.on('completed', (job, result) => {
  console.log(
    `[Budget Check Worker] Job ${job.id} completed: ${result.totalAlerts} alerts sent`
  );
});

budgetCheckWorker.on('failed', (job, error) => {
  console.error(`[Budget Check Worker] Job ${job?.id} failed:`, error);
});

budgetCheckWorker.on('error', (error) => {
  console.error('[Budget Check Worker] Worker error:', error);
});

console.log('✅ Budget Check Worker started');
