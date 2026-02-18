import { db } from '../../../config/database';
import { BankTransaction } from '../../../db/types';

export interface RecurringPattern {
  merchant: string;
  amount: number;
  billingCycle: string;
  confidence: number;
  transactionCount: number;
  lastTransaction: {
    date: string;
    amount: number;
    transactionId: string;
  };
  transactions: Array<{
    date: string;
    amount: number;
    transactionId: string;
  }>;
}

/**
 * Bank Detection Service
 * Detects recurring subscription patterns from bank transactions
 * CRITICAL: Preserves exact algorithm from original implementation (lines 195-268 of mock-indian-banks.js)
 */
export class BankDetectionService {
  /**
   * Detect recurring patterns in transactions
   * Preserves exact algorithm from original implementation
   */
  detectRecurringPatterns(transactions: BankTransaction[]): RecurringPattern[] {
    const merchantGroups: Record<string, Array<{ date: string; amount: number; transactionId: string }>> = {};

    // Group transactions by merchant
    transactions.forEach((txn) => {
      const merchant = txn.merchant_name || 'Unknown Merchant';
      const amount = Math.abs(parseFloat(txn.amount as any));

      if (!merchantGroups[merchant]) {
        merchantGroups[merchant] = [];
      }

      merchantGroups[merchant].push({
        date: txn.transaction_date.toISOString(),
        amount: amount,
        transactionId: txn.id,
      });
    });

    const recurringPatterns: RecurringPattern[] = [];

    Object.entries(merchantGroups).forEach(([merchant, txns]) => {
      if (txns.length < 2) return;

      // Sort by date
      txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate amount variance
      const amounts = txns.map((t) => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const amountVariance = amounts.every((amt) => Math.abs(amt - avgAmount) < avgAmount * 0.1);

      if (txns.length >= 2) {
        // Calculate intervals between transactions
        const intervals: number[] = [];
        for (let i = 1; i < txns.length; i++) {
          const days = Math.round(
            (new Date(txns[i].date).getTime() - new Date(txns[i - 1].date).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          intervals.push(days);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        let billingCycle = 'monthly';
        let confidence = 0;

        // Determine billing cycle and confidence based on interval
        if (avgInterval >= 28 && avgInterval <= 31) {
          billingCycle = 'monthly';
          confidence = amountVariance ? 0.9 : 0.7;
        } else if (avgInterval >= 89 && avgInterval <= 92) {
          billingCycle = 'quarterly';
          confidence = amountVariance ? 0.85 : 0.65;
        } else if (avgInterval >= 358 && avgInterval <= 370) {
          billingCycle = 'yearly';
          confidence = amountVariance ? 0.9 : 0.7;
        } else if (avgInterval >= 6 && avgInterval <= 8) {
          billingCycle = 'weekly';
          confidence = amountVariance ? 0.85 : 0.65;
        } else {
          confidence = 0.5;
        }

        // Only add if confidence is high enough
        if (confidence >= 0.6 && txns.length >= 2) {
          recurringPatterns.push({
            merchant,
            amount: avgAmount,
            billingCycle,
            confidence,
            transactionCount: txns.length,
            lastTransaction: txns[txns.length - 1],
            transactions: txns,
          });
        }
      }
    });

    // Sort by confidence (highest first)
    return recurringPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get transactions for a user from the database
   */
  async getUserTransactions(
    userId: string,
    daysBack: number = 365
  ): Promise<BankTransaction[]> {
    const result = await db.query<BankTransaction>(
      `SELECT id, user_id, connected_account_id, transaction_id, transaction_date,
              description, amount, currency, transaction_type, category, merchant_name,
              is_recurring, subscription_id, created_at
       FROM bank_transactions
       WHERE user_id = $1
         AND transaction_date >= CURRENT_DATE - INTERVAL '${daysBack} days'
         AND transaction_type = 'debit'
       ORDER BY transaction_date DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Analyze bank transactions and detect recurring subscriptions
   */
  async analyzeTransactions(userId: string, daysBack: number = 365): Promise<RecurringPattern[]> {
    const transactions = await this.getUserTransactions(userId, daysBack);

    if (transactions.length === 0) {
      return [];
    }

    return this.detectRecurringPatterns(transactions);
  }

  /**
   * Map category from merchant name
   */
  categorizeMerchant(merchantName: string): string {
    const name = merchantName.toLowerCase();

    // Streaming services
    if (name.includes('netflix') || name.includes('prime') || name.includes('hotstar') ||
        name.includes('disney') || name.includes('youtube')) {
      return 'Streaming';
    }

    // Music services
    if (name.includes('spotify') || name.includes('apple music') || name.includes('gaana') ||
        name.includes('saavn')) {
      return 'Music';
    }

    // Investment platforms
    if (name.includes('groww') || name.includes('zerodha') || name.includes('upstox') ||
        name.includes('mutual fund') || name.includes('sip')) {
      return 'Investment';
    }

    // Food delivery
    if (name.includes('zomato') || name.includes('swiggy') || name.includes('uber eats')) {
      return 'Food & Dining';
    }

    // Fitness
    if (name.includes('gym') || name.includes('fitness') || name.includes('cult.fit')) {
      return 'Fitness';
    }

    // Cloud storage
    if (name.includes('google one') || name.includes('icloud') || name.includes('dropbox')) {
      return 'Cloud Storage';
    }

    // Default
    return 'Other';
  }
}

// Export singleton instance
export const bankDetectionService = new BankDetectionService();
