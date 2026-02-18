import { db } from '../../config/database';
import { DetectedSubscription } from '../../db/types';
import { emailDetectionService } from './sources/email-detection';
import { bankDetectionService } from './sources/bank-detection';
import { subscriptionService } from '../subscriptions/subscriptions.service';

export interface DetectionResult {
  id: string;
  name: string;
  category: string | null;
  amount: number | null;
  currency: string;
  billingCycle: string | null;
  nextBillingDate: Date | null;
  description: string | null;
  confidenceScore: number;
  source: 'email' | 'bank' | 'sms';
  sourceIdentifier: string | null;
  status: string;
  detectedAt: Date;
}

/**
 * Detection Service
 * Orchestrates multi-source detection with deduplication and confidence scoring
 */
export class DetectionService {
  /**
   * Scan emails for subscriptions
   */
  async scanEmails(
    userId: string,
    accessToken: string,
    refreshToken: string,
    options: {
      maxEmails?: number;
      daysBack?: number;
      deepScan?: boolean;
    } = {}
  ): Promise<{ processed: number; detected: number }> {
    const { maxEmails = 200, daysBack = 365, deepScan = false } = options;

    // Get email messages
    let messages: any[];
    if (deepScan) {
      messages = await emailDetectionService.deepScanAllEmails(accessToken, refreshToken, daysBack);
    } else {
      const result = await emailDetectionService.searchSubscriptionEmails(
        accessToken,
        refreshToken,
        { maxResults: maxEmails, daysBack }
      );
      messages = result.messages;
    }

    let detectedCount = 0;

    // Process each email
    for (const message of messages.slice(0, maxEmails)) {
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
          await this.storeDetection(userId, {
            name: aiResult.serviceName,
            category: aiResult.category || null,
            amount: aiResult.amount || null,
            currency: aiResult.currency || 'INR',
            billingCycle: aiResult.billingCycle || 'monthly',
            nextBillingDate: aiResult.nextBillingDate
              ? new Date(aiResult.nextBillingDate)
              : null,
            description: aiResult.description || null,
            confidenceScore: (aiResult.confidence || 50) / 100, // Convert to 0-1
            source: 'email',
            sourceIdentifier: message.id,
            rawData: {
              email: emailDetails,
              aiResult,
            },
          });

          detectedCount++;
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing email ${message.id}:`, error);
        // Continue with next email
      }
    }

    return {
      processed: Math.min(messages.length, maxEmails),
      detected: detectedCount,
    };
  }

  /**
   * Scan bank transactions for recurring patterns
   */
  async scanBankTransactions(
    userId: string,
    daysBack: number = 365
  ): Promise<{ detected: number }> {
    const patterns = await bankDetectionService.analyzeTransactions(userId, daysBack);

    let detectedCount = 0;

    for (const pattern of patterns) {
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

      await this.storeDetection(userId, {
        name: pattern.merchant,
        category,
        amount: pattern.amount,
        currency: 'INR',
        billingCycle: pattern.billingCycle,
        nextBillingDate,
        description: `Recurring pattern detected from ${pattern.transactionCount} transactions`,
        confidenceScore: pattern.confidence,
        source: 'bank',
        sourceIdentifier: pattern.lastTransaction.transactionId,
        rawData: {
          pattern,
          transactions: pattern.transactions,
        },
      });

      detectedCount++;
    }

    return { detected: detectedCount };
  }

  /**
   * Store a detection with deduplication
   */
  private async storeDetection(
    userId: string,
    detection: {
      name: string;
      category: string | null;
      amount: number | null;
      currency: string;
      billingCycle: string | null;
      nextBillingDate: Date | null;
      description: string | null;
      confidenceScore: number;
      source: 'email' | 'bank' | 'sms';
      sourceIdentifier: string | null;
      rawData: any;
    }
  ): Promise<void> {
    // Check for duplicates (same name, similar amount, same source)
    const duplicateCheck = await db.query<DetectedSubscription>(
      `SELECT id FROM detected_subscriptions
       WHERE user_id = $1
         AND LOWER(name) = LOWER($2)
         AND source = $3
         AND status = 'pending'
         AND ABS(COALESCE(amount, 0) - COALESCE($4, 0)) < 1
       LIMIT 1`,
      [userId, detection.name, detection.source, detection.amount || 0]
    );

    // Skip if duplicate found
    if (duplicateCheck.rows.length > 0) {
      return;
    }

    // Insert detection
    await db.query(
      `INSERT INTO detected_subscriptions (
        user_id, name, category, amount, currency, billing_cycle,
        next_billing_date, description, confidence_score, source,
        source_identifier, raw_data, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')`,
      [
        userId,
        detection.name,
        detection.category,
        detection.amount,
        detection.currency,
        detection.billingCycle,
        detection.nextBillingDate,
        detection.description,
        detection.confidenceScore,
        detection.source,
        detection.sourceIdentifier,
        JSON.stringify(detection.rawData),
      ]
    );
  }

  /**
   * Get all detections for a user
   */
  async getDetections(
    userId: string,
    status?: string
  ): Promise<DetectionResult[]> {
    let query = `
      SELECT id, user_id, name, category, amount, currency, billing_cycle,
             next_billing_date, description, confidence_score, source,
             source_identifier, status, detected_at
      FROM detected_subscriptions
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY confidence_score DESC, detected_at DESC';

    const result = await db.query<any>(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      amount: row.amount ? parseFloat(row.amount) : null,
      currency: row.currency,
      billingCycle: row.billing_cycle,
      nextBillingDate: row.next_billing_date,
      description: row.description,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : 0,
      source: row.source,
      sourceIdentifier: row.source_identifier,
      status: row.status,
      detectedAt: row.detected_at,
    }));
  }

  /**
   * Import a detection as a subscription
   */
  async importDetection(userId: string, detectionId: string): Promise<void> {
    // Get detection
    const detectionResult = await db.query<DetectedSubscription>(
      `SELECT id, name, category, amount, currency, billing_cycle,
              next_billing_date, description
       FROM detected_subscriptions
       WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [detectionId, userId]
    );

    if (detectionResult.rows.length === 0) {
      throw new Error('Detection not found or already imported');
    }

    const detection = detectionResult.rows[0];

    // Create subscription
    const subscription = await subscriptionService.createSubscription(userId, {
      name: detection.name,
      category: detection.category || 'Other',
      amount: detection.amount ? parseFloat(detection.amount as any) : null,
      currency: detection.currency,
      billing_cycle: (detection.billing_cycle as any) || 'monthly',
      next_billing_date: detection.next_billing_date?.toISOString() || null,
      description: detection.description,
      reminder_days_before: 3,
    });

    // Update detection status
    await db.query(
      `UPDATE detected_subscriptions
       SET status = 'imported', imported_subscription_id = $1
       WHERE id = $2`,
      [subscription.id, detectionId]
    );
  }

  /**
   * Update detection status (confirm/reject)
   */
  async updateDetectionStatus(
    userId: string,
    detectionId: string,
    status: 'confirmed' | 'rejected'
  ): Promise<void> {
    const result = await db.query(
      `UPDATE detected_subscriptions
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING id`,
      [status, detectionId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Detection not found');
    }
  }
}

// Export singleton instance
export const detectionService = new DetectionService();
