import { Worker, Job } from 'bullmq';
import { appConfig } from '../../config';
import { EmailScanJobData } from '../queue';
import { emailDetectionService } from '../../modules/detection/sources/email-detection';
import { db } from '../../config/database';
import { DetectedSubscription } from '../../db/types';

/**
 * Email Scan Worker
 * Processes email scanning jobs asynchronously
 * Replaces synchronous HTTP handler from detection.routes.ts
 */

const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  password: appConfig.redis.password || undefined,
  maxRetriesPerRequest: null,
};

export interface EmailScanResult {
  processed: number;
  detected: number;
  detectedIds: string[];
}

async function processEmailScan(job: Job<EmailScanJobData>): Promise<EmailScanResult> {
  const { userId, accessToken, refreshToken, maxEmails = 200, daysBack = 365, deepScan = false } = job.data;

  console.log(`[Email Scan Worker] Starting scan for user ${userId}`);
  await job.updateProgress(0);

  let messages: any[];

  try {
    // Get email messages
    if (deepScan) {
      await job.updateProgress(5);
      messages = await emailDetectionService.deepScanAllEmails(
        accessToken,
        refreshToken,
        daysBack,
        (progress) => {
          // Update job progress based on pages processed
          const progressPercent = Math.min(Math.floor((progress.totalSoFar / maxEmails) * 50), 50);
          job.updateProgress(5 + progressPercent);
          console.log(`[Email Scan Worker] Page ${progress.page}: ${progress.totalSoFar} emails found`);
        }
      );
    } else {
      await job.updateProgress(10);
      const result = await emailDetectionService.searchSubscriptionEmails(
        accessToken,
        refreshToken,
        { maxResults: maxEmails, daysBack }
      );
      messages = result.messages;
      await job.updateProgress(30);
    }

    console.log(`[Email Scan Worker] Processing ${messages.length} emails`);

    let detectedCount = 0;
    const detectedIds: string[] = [];
    const totalMessages = Math.min(messages.length, maxEmails);

    // Process each email
    for (let i = 0; i < totalMessages; i++) {
      const message = messages[i];

      try {
        // Get email details
        const emailDetails = await emailDetectionService.getEmailDetails(
          accessToken,
          refreshToken,
          message.id
        );

        // Analyze with AI
        const aiResult = await emailDetectionService.analyzeEmailWithAI(emailDetails);

        // If it's a subscription, store detection
        if (aiResult.isSubscription && aiResult.serviceName) {
          const detectionId = await storeDetection(userId, message.id, emailDetails, aiResult);

          if (detectionId) {
            detectedCount++;
            detectedIds.push(detectionId);
          }
        }

        // Update progress (30% to 95% for processing)
        const processingProgress = 30 + Math.floor((i / totalMessages) * 65);
        await job.updateProgress(processingProgress);

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[Email Scan Worker] Error processing email ${message.id}:`, error);
        // Continue with next email
      }
    }

    await job.updateProgress(100);

    console.log(`[Email Scan Worker] Completed: ${detectedCount} subscriptions detected`);

    return {
      processed: totalMessages,
      detected: detectedCount,
      detectedIds,
    };
  } catch (error) {
    console.error('[Email Scan Worker] Fatal error:', error);
    throw error;
  }
}

/**
 * Store a detection with deduplication
 */
async function storeDetection(
  userId: string,
  emailId: string,
  emailDetails: { subject: string; from: string; date: string; body: string },
  aiResult: any
): Promise<string | null> {
  // Check for duplicates (same name, similar amount, same source)
  const duplicateCheck = await db.query<DetectedSubscription>(
    `SELECT id FROM detected_subscriptions
     WHERE user_id = $1
       AND LOWER(name) = LOWER($2)
       AND source = 'email'
       AND status = 'pending'
       AND ABS(COALESCE(amount, 0) - COALESCE($3, 0)) < 1
     LIMIT 1`,
    [userId, aiResult.serviceName, aiResult.amount || 0]
  );

  // Skip if duplicate found
  if (duplicateCheck.rows.length > 0) {
    return null;
  }

  // Insert detection
  const result = await db.query(
    `INSERT INTO detected_subscriptions (
      user_id, name, category, amount, currency, billing_cycle,
      next_billing_date, description, confidence_score, source,
      source_identifier, raw_data, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'email', $10, $11, 'pending')
    RETURNING id`,
    [
      userId,
      aiResult.serviceName,
      aiResult.category || null,
      aiResult.amount || null,
      aiResult.currency || 'INR',
      aiResult.billingCycle || 'monthly',
      aiResult.nextBillingDate ? new Date(aiResult.nextBillingDate) : null,
      aiResult.description || null,
      (aiResult.confidence || 50) / 100, // Convert to 0-1
      emailId,
      JSON.stringify({ email: emailDetails, aiResult }),
    ]
  );

  return result.rows[0].id;
}

// Create and start worker
export const emailScanWorker = new Worker<EmailScanJobData, EmailScanResult>(
  'email-scan',
  processEmailScan,
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 scans concurrently max
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // Per minute
    },
  }
);

emailScanWorker.on('completed', (job, result) => {
  console.log(`[Email Scan Worker] Job ${job.id} completed: ${result.detected} detected`);
});

emailScanWorker.on('failed', (job, error) => {
  console.error(`[Email Scan Worker] Job ${job?.id} failed:`, error);
});

emailScanWorker.on('error', (error) => {
  console.error('[Email Scan Worker] Worker error:', error);
});

console.log('✅ Email Scan Worker started');
