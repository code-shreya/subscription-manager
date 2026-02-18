import { db } from '../../config/database';
import { Subscription } from '../../db/types';

export interface AnalyticsOverview {
  totalMonthly: string;
  totalYearly: string;
  totalSubscriptions: number;
  subscriptionsWithAmount: number;
  subscriptionsWithoutAmount: number;
  categoryBreakdown: CategoryBreakdown[];
  upcomingRenewals: Subscription[];
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  monthly_amount: number;
}

/**
 * Analytics Service
 * Handles subscription analytics and reporting
 */
export class AnalyticsService {
  /**
   * Get analytics overview for a user
   */
  async getOverview(userId: string): Promise<AnalyticsOverview> {
    // Get all active subscriptions
    const activeSubscriptions = await db.query<Subscription>(
      `SELECT id, name, category, amount, currency, billing_cycle, next_billing_date,
              status, created_at, updated_at
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const subscriptions = activeSubscriptions.rows;

    // Calculate monthly and yearly totals
    let monthlyTotal = 0;
    let subscriptionsWithAmount = 0;
    let subscriptionsWithoutAmount = 0;

    subscriptions.forEach((sub) => {
      if (sub.amount && !isNaN(parseFloat(sub.amount as any))) {
        subscriptionsWithAmount++;

        const amount = parseFloat(sub.amount as any);

        switch (sub.billing_cycle) {
          case 'daily':
            monthlyTotal += amount * 30; // Approximate month
            break;
          case 'weekly':
            monthlyTotal += amount * 4.33; // Average weeks per month
            break;
          case 'monthly':
            monthlyTotal += amount;
            break;
          case 'quarterly':
            monthlyTotal += amount / 3;
            break;
          case 'yearly':
            monthlyTotal += amount / 12;
            break;
          case 'one-time':
            // Don't add to monthly recurring
            break;
        }
      } else {
        subscriptionsWithoutAmount++;
      }
    });

    const yearlyTotal = monthlyTotal * 12;

    // Category breakdown
    const categoryMap: Record<string, CategoryBreakdown> = {};

    subscriptions.forEach((sub) => {
      if (!categoryMap[sub.category]) {
        categoryMap[sub.category] = {
          category: sub.category,
          count: 0,
          monthly_amount: 0,
        };
      }

      categoryMap[sub.category].count++;

      if (sub.amount && !isNaN(parseFloat(sub.amount as any))) {
        const amount = parseFloat(sub.amount as any);
        let monthlyAmount = 0;

        switch (sub.billing_cycle) {
          case 'daily':
            monthlyAmount = amount * 30;
            break;
          case 'weekly':
            monthlyAmount = amount * 4.33;
            break;
          case 'monthly':
            monthlyAmount = amount;
            break;
          case 'quarterly':
            monthlyAmount = amount / 3;
            break;
          case 'yearly':
            monthlyAmount = amount / 12;
            break;
        }

        categoryMap[sub.category].monthly_amount += monthlyAmount;
      }
    });

    const categoryBreakdown = Object.values(categoryMap);

    // Upcoming renewals (next 30 days)
    const upcomingRenewalsResult = await db.query<Subscription>(
      `SELECT id, name, category, amount, currency, billing_cycle, next_billing_date,
              status, created_at, updated_at
       FROM subscriptions
       WHERE user_id = $1
         AND status = 'active'
         AND next_billing_date IS NOT NULL
         AND next_billing_date >= CURRENT_DATE
         AND next_billing_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY next_billing_date ASC
       LIMIT 5`,
      [userId]
    );

    return {
      totalMonthly: monthlyTotal.toFixed(2),
      totalYearly: yearlyTotal.toFixed(2),
      totalSubscriptions: subscriptions.length,
      subscriptionsWithAmount,
      subscriptionsWithoutAmount,
      categoryBreakdown,
      upcomingRenewals: upcomingRenewalsResult.rows,
    };
  }

  /**
   * Get spending trends over time
   */
  async getSpendingTrends(_userId: string, months: number = 6): Promise<any> {
    // This would require historical data tracking
    // For now, return placeholder for future implementation
    return {
      message: 'Spending trends will be available once historical data is tracked',
      months,
    };
  }

  /**
   * Get most expensive subscriptions
   */
  async getMostExpensive(userId: string, limit: number = 5): Promise<Subscription[]> {
    const result = await db.query<Subscription>(
      `SELECT id, name, category, amount, currency, billing_cycle, next_billing_date,
              status, created_at, updated_at
       FROM subscriptions
       WHERE user_id = $1
         AND status = 'active'
         AND amount IS NOT NULL
       ORDER BY amount DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
