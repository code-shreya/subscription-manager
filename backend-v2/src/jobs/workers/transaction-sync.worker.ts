import { Worker, Job } from 'bullmq';
import { appConfig } from '../../config';
import { TransactionSyncJobData } from '../queue';
import { bankDetectionService } from '../../modules/detection/sources/bank-detection';
import { db } from '../../config/database';

/**
 * Transaction Sync Worker
 * Syncs bank transactions and detects recurring patterns
 */

const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  password: appConfig.redis.password || undefined,
  maxRetriesPerRequest: null,
};

export interface TransactionSyncResult {
  transactionsSynced: number;
  patternsDetected: number;
  detectedIds: string[];
}

async function processTransactionSync(job: Job<TransactionSyncJobData>): Promise<TransactionSyncResult> {
  const { userId, daysBack = 365 } = job.data;

  console.log(`[Transaction Sync Worker] Syncing transactions for user ${userId}`);
  await job.updateProgress(0);

  try {
    // In a real implementation, this would fetch transactions from the bank API
    // For now, we'll use existing transactions in the database
    await job.updateProgress(20);

    // Get user transactions
    const transactions = await bankDetectionService.getUserTransactions(userId, daysBack);

    await job.updateProgress(40);

    console.log(`[Transaction Sync Worker] Found ${transactions.length} transactions`);

    // Detect recurring patterns
    const patterns = bankDetectionService.detectRecurringPatterns(transactions);

    await job.updateProgress(60);

    console.log(`[Transaction Sync Worker] Detected ${patterns.length} recurring patterns`);

    const detectedIds: string[] = [];

    // Store detected patterns as subscription candidates
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const category = bankDetectionService.categorizeMerchant(pattern.merchant);

      // Calculate next billing date based on last transaction and cycle
      let nextBillingDate: Date | null = null;
      if (pattern.lastTransaction) {
        const lastDate = new Date(pattern.lastTransaction.date);
        nextBillingDate = new Date(lastDate);

        switch (pattern.billingCycle) {
          case 'weekly':
            nextBillingDate.setDate(nextBillingDate.getDate() + 7);
            break;
          case 'monthly':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
            break;
          case 'yearly':
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            break;
        }
      }

      // Check for duplicates
      const duplicateCheck = await db.query(
        `SELECT id FROM detected_subscriptions
         WHERE user_id = $1
           AND LOWER(name) = LOWER($2)
           AND source = 'bank'
           AND status = 'pending'
           AND ABS(COALESCE(amount, 0) - COALESCE($3, 0)) < 1
         LIMIT 1`,
        [userId, pattern.merchant, pattern.amount]
      );

      if (duplicateCheck.rows.length === 0) {
        // Insert detection
        const result = await db.query(
          `INSERT INTO detected_subscriptions (
            user_id, name, category, amount, currency, billing_cycle,
            next_billing_date, description, confidence_score, source,
            source_identifier, raw_data, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'bank', $10, $11, 'pending')
          RETURNING id`,
          [
            userId,
            pattern.merchant,
            category,
            pattern.amount,
            'INR',
            pattern.billingCycle,
            nextBillingDate,
            `Recurring pattern detected from ${pattern.transactionCount} transactions`,
            pattern.confidence,
            pattern.lastTransaction.transactionId,
            JSON.stringify({
              pattern,
              transactions: pattern.transactions,
            }),
          ]
        );

        detectedIds.push(result.rows[0].id);
      }

      // Update progress
      const progress = 60 + Math.floor((i / patterns.length) * 40);
      await job.updateProgress(progress);
    }

    await job.updateProgress(100);

    console.log(`[Transaction Sync Worker] Completed: ${patterns.length} patterns detected`);

    return {
      transactionsSynced: transactions.length,
      patternsDetected: patterns.length,
      detectedIds,
    };
  } catch (error) {
    console.error('[Transaction Sync Worker] Fatal error:', error);
    throw error;
  }
}

// Create and start worker
export const transactionSyncWorker = new Worker<TransactionSyncJobData, TransactionSyncResult>(
  'transaction-sync',
  processTransactionSync,
  {
    connection: redisConnection,
    concurrency: 3, // Process 3 syncs concurrently max
  }
);

transactionSyncWorker.on('completed', (job, result) => {
  console.log(
    `[Transaction Sync Worker] Job ${job.id} completed: ${result.patternsDetected} patterns detected`
  );
});

transactionSyncWorker.on('failed', (job, error) => {
  console.error(`[Transaction Sync Worker] Job ${job?.id} failed:`, error);
});

transactionSyncWorker.on('error', (error) => {
  console.error('[Transaction Sync Worker] Worker error:', error);
});

console.log('✅ Transaction Sync Worker started');
