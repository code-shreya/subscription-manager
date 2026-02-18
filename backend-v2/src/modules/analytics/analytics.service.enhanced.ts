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

export interface SpendingTrend {
  period: string; // YYYY-MM or YYYY-QN or YYYY
  amount: number;
  count: number;
  change?: number; // Percentage change from previous period
}

export interface PriceChange {
  subscriptionId: string;
  subscriptionName: string;
  category: string;
  oldAmount: number;
  newAmount: number;
  changedAt: Date;
  percentageChange: number;
}

export interface Insight {
  type: 'duplicate' | 'expensive' | 'rarely_used' | 'savings' | 'trend' | 'alternative';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionable: boolean;
  metadata?: any;
}

export interface YearlyPatterns {
  totalFound: number;
  uniqueServices: number;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
  byCurrency: Record<string, number>;
  byBillingCycle: Record<string, number>;
  averageConfidence: number;
  estimatedAnnualCost: number;
  topServices: Array<{ name: string; detectionCount: number }>;
  cancelSuggestions: Array<{
    service: string;
    reason: string;
    monthlyAmount: number;
    currency: string;
    annualSavings: number;
  }>;
}

/**
 * Enhanced Analytics Service
 * Provides advanced insights, trends, predictions, and exports
 */
export class EnhancedAnalyticsService {
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
            monthlyTotal += amount * 30;
            break;
          case 'weekly':
            monthlyTotal += amount * 4.33;
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
   * Get spending trends over time with YoY comparison
   */
  async getSpendingTrends(
    userId: string,
    months: number = 12,
    _granularity: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<SpendingTrend[]> {
    // Get subscription creation history
    const result = await db.query<any>(
      `SELECT
        DATE_TRUNC('month', created_at) as period,
        COUNT(*) as count,
        COALESCE(SUM(
          CASE
            WHEN billing_cycle = 'monthly' THEN amount
            WHEN billing_cycle = 'yearly' THEN amount / 12
            WHEN billing_cycle = 'quarterly' THEN amount / 3
            WHEN billing_cycle = 'weekly' THEN amount * 4.33
            WHEN billing_cycle = 'daily' THEN amount * 30
            ELSE 0
          END
        ), 0) as monthly_amount
       FROM subscriptions
       WHERE user_id = $1
         AND amount IS NOT NULL
         AND created_at >= CURRENT_DATE - INTERVAL '${months} months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY period DESC`,
      [userId]
    );

    const trends: SpendingTrend[] = result.rows.map((row, index) => {
      const trend: SpendingTrend = {
        period: row.period.toISOString().substring(0, 7), // YYYY-MM
        amount: parseFloat(row.monthly_amount),
        count: parseInt(row.count),
      };

      // Calculate percentage change from previous period
      if (index < result.rows.length - 1) {
        const prevAmount = parseFloat(result.rows[index + 1].monthly_amount);
        if (prevAmount > 0) {
          trend.change = ((trend.amount - prevAmount) / prevAmount) * 100;
        }
      }

      return trend;
    });

    return trends;
  }

  /**
   * Get price changes from subscription_price_history
   */
  async getPriceChanges(userId: string, limit: number = 10): Promise<PriceChange[]> {
    const result = await db.query<any>(
      `SELECT
        sph.subscription_id,
        s.name as subscription_name,
        s.category,
        sph.old_amount,
        sph.new_amount,
        sph.changed_at,
        ((sph.new_amount - sph.old_amount) / sph.old_amount * 100) as percentage_change
       FROM subscription_price_history sph
       JOIN subscriptions s ON sph.subscription_id = s.id
       WHERE s.user_id = $1
       ORDER BY sph.changed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => ({
      subscriptionId: row.subscription_id,
      subscriptionName: row.subscription_name,
      category: row.category,
      oldAmount: parseFloat(row.old_amount),
      newAmount: parseFloat(row.new_amount),
      changedAt: row.changed_at,
      percentageChange: parseFloat(row.percentage_change),
    }));
  }

  /**
   * Generate AI-powered insights
   * Preserves logic from original analysisService.js (lines 155-266)
   */
  async generateInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Get user subscriptions
    const subscriptions = await db.query<Subscription>(
      `SELECT id, name, category, amount, currency, billing_cycle, status, created_at
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const subs = subscriptions.rows;

    // 1. Detect duplicates (same service name)
    const nameMap = new Map<string, Subscription[]>();
    subs.forEach((sub) => {
      const lowerName = sub.name.toLowerCase();
      if (!nameMap.has(lowerName)) {
        nameMap.set(lowerName, []);
      }
      nameMap.get(lowerName)!.push(sub);
    });

    nameMap.forEach((duplicates) => {
      if (duplicates.length > 1) {
        const totalMonthly = duplicates.reduce((sum, sub) => {
          const amount = parseFloat(sub.amount as any) || 0;
          return sum + (sub.billing_cycle === 'yearly' ? amount / 12 : amount);
        }, 0);

        insights.push({
          type: 'duplicate',
          severity: 'high',
          title: `Duplicate subscription detected: ${duplicates[0].name}`,
          description: `You have ${duplicates.length} active subscriptions for ${duplicates[0].name}`,
          impact: `Potential monthly savings: ${duplicates[0].currency} ${totalMonthly.toFixed(2)}`,
          actionable: true,
          metadata: { subscriptions: duplicates.map((s) => s.id) },
        });
      }
    });

    // 2. Expensive subscriptions (from original logic)
    const expensiveThreshold = 500; // INR per month
    subs.forEach((sub) => {
      const amount = parseFloat(sub.amount as any) || 0;
      const monthlyAmount =
        sub.billing_cycle === 'yearly'
          ? amount / 12
          : sub.billing_cycle === 'quarterly'
          ? amount / 3
          : amount;

      if (monthlyAmount > expensiveThreshold) {
        insights.push({
          type: 'expensive',
          severity: 'medium',
          title: `High-cost subscription: ${sub.name}`,
          description: `${sub.name} costs ${sub.currency} ${monthlyAmount.toFixed(2)}/month`,
          impact: `Annual cost: ${sub.currency} ${(monthlyAmount * 12).toFixed(2)}`,
          actionable: true,
          metadata: { subscriptionId: sub.id, monthlyAmount },
        });
      }
    });

    // 3. Rarely used subscriptions (low detection count)
    const detectedSubs = await db.query<any>(
      `SELECT name, COUNT(*) as detection_count
       FROM detected_subscriptions
       WHERE user_id = $1
       GROUP BY name
       HAVING COUNT(*) < 3`,
      [userId]
    );

    detectedSubs.rows.forEach((detected) => {
      const matchingSub = subs.find(
        (s) => s.name.toLowerCase() === detected.name.toLowerCase()
      );

      if (matchingSub) {
        insights.push({
          type: 'rarely_used',
          severity: 'low',
          title: `Rarely used: ${detected.name}`,
          description: `Only ${detected.detection_count} email${detected.detection_count !== 1 ? 's' : ''} detected in the past year`,
          impact: 'Consider cancelling if not actively used',
          actionable: true,
          metadata: { subscriptionId: matchingSub.id },
        });
      }
    });

    // 4. Spending trend insights
    const trends = await this.getSpendingTrends(userId, 6);
    if (trends.length >= 2) {
      const recentTrend = trends[0];
      if (recentTrend.change && recentTrend.change > 20) {
        insights.push({
          type: 'trend',
          severity: 'medium',
          title: 'Spending increased significantly',
          description: `Your subscription spending increased by ${recentTrend.change.toFixed(1)}% this month`,
          impact: `Review recent subscriptions to identify new charges`,
          actionable: true,
          metadata: { change: recentTrend.change },
        });
      }
    }

    // 5. Savings opportunities (from original cancel suggestions)
    const expensiveSubs = subs
      .filter((sub) => {
        const amount = parseFloat(sub.amount as any) || 0;
        const monthly = sub.billing_cycle === 'yearly' ? amount / 12 : amount;
        return monthly > expensiveThreshold;
      })
      .slice(0, 3);

    if (expensiveSubs.length > 0) {
      const totalSavings = expensiveSubs.reduce((sum, sub) => {
        const amount = parseFloat(sub.amount as any) || 0;
        const monthly = sub.billing_cycle === 'yearly' ? amount / 12 : amount;
        return sum + monthly * 12;
      }, 0);

      insights.push({
        type: 'savings',
        severity: 'medium',
        title: 'Potential annual savings',
        description: `Review ${expensiveSubs.length} expensive subscription${expensiveSubs.length !== 1 ? 's' : ''}`,
        impact: `Potential savings: INR ${totalSavings.toFixed(2)}/year`,
        actionable: true,
        metadata: { subscriptions: expensiveSubs.map((s) => s.id) },
      });
    }

    return insights.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Analyze yearly patterns from detected subscriptions
   * Preserves logic from original analysisService.js (lines 155-266)
   */
  async analyzeYearlyPatterns(userId: string): Promise<YearlyPatterns> {
    const detectedSubs = await db.query<any>(
      `SELECT name, category, amount, currency, billing_cycle, confidence_score, detected_at
       FROM detected_subscriptions
       WHERE user_id = $1
         AND detected_at >= CURRENT_DATE - INTERVAL '365 days'`,
      [userId]
    );

    const subscriptions = detectedSubs.rows;

    const analysis: YearlyPatterns = {
      totalFound: subscriptions.length,
      uniqueServices: new Set(subscriptions.map((s: any) => s.name)).size,
      byCategory: {},
      byMonth: {},
      byCurrency: {},
      byBillingCycle: {},
      averageConfidence: 0,
      estimatedAnnualCost: 0,
      topServices: [],
      cancelSuggestions: [],
    };

    // Group by category
    subscriptions.forEach((sub: any) => {
      const category = sub.category || 'Other';
      analysis.byCategory[category] = (analysis.byCategory[category] || 0) + 1;
    });

    // Group by month
    subscriptions.forEach((sub: any) => {
      if (sub.detected_at) {
        const date = new Date(sub.detected_at);
        const month = date.toLocaleString('default', { month: 'short' });
        analysis.byMonth[month] = (analysis.byMonth[month] || 0) + 1;
      }
    });

    // Group by currency
    subscriptions.forEach((sub: any) => {
      const currency = sub.currency || 'Unknown';
      analysis.byCurrency[currency] = (analysis.byCurrency[currency] || 0) + 1;
    });

    // Group by billing cycle
    subscriptions.forEach((sub: any) => {
      const cycle = sub.billing_cycle || 'unknown';
      analysis.byBillingCycle[cycle] = (analysis.byBillingCycle[cycle] || 0) + 1;
    });

    // Calculate average confidence
    const totalConfidence = subscriptions.reduce(
      (sum: number, s: any) => sum + ((s.confidence_score || 0) * 100),
      0
    );
    analysis.averageConfidence = Math.round(totalConfidence / subscriptions.length);

    // Estimate annual cost
    subscriptions.forEach((sub: any) => {
      if (sub.amount) {
        const amount = parseFloat(sub.amount);
        if (sub.billing_cycle === 'monthly') {
          analysis.estimatedAnnualCost += amount * 12;
        } else if (sub.billing_cycle === 'yearly') {
          analysis.estimatedAnnualCost += amount;
        } else if (sub.billing_cycle === 'quarterly') {
          analysis.estimatedAnnualCost += amount * 4;
        }
      }
    });

    // Find top services by frequency
    const serviceCounts: Record<string, number> = {};
    subscriptions.forEach((sub: any) => {
      const name = sub.name;
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
    });

    analysis.topServices = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, detectionCount: count }));

    // Generate cancel suggestions (from original logic)
    const serviceAmounts = new Map<string, any>();
    subscriptions.forEach((sub: any) => {
      if (sub.name && sub.amount) {
        const existing = serviceAmounts.get(sub.name);
        if (!existing || parseFloat(existing.amount) < parseFloat(sub.amount)) {
          serviceAmounts.set(sub.name, sub);
        }
      }
    });

    const expensiveThreshold = 500; // INR per month
    serviceAmounts.forEach((sub, name) => {
      const amount = parseFloat(sub.amount);
      const monthlyAmount =
        sub.billing_cycle === 'yearly'
          ? amount / 12
          : sub.billing_cycle === 'quarterly'
          ? amount / 3
          : amount;

      const detectionCount = serviceCounts[name] || 0;

      if (monthlyAmount > expensiveThreshold && detectionCount < 3) {
        analysis.cancelSuggestions.push({
          service: name,
          reason:
            detectionCount < 2
              ? 'Rarely used (few emails detected)'
              : 'Expensive subscription',
          monthlyAmount: Math.round(monthlyAmount),
          currency: sub.currency || 'INR',
          annualSavings: Math.round(monthlyAmount * 12),
        });
      }
    });

    return analysis;
  }

  /**
   * Export subscriptions to CSV format
   */
  async exportToCSV(userId: string): Promise<string> {
    const subscriptions = await db.query<Subscription>(
      `SELECT name, category, amount, currency, billing_cycle,
              next_billing_date, status, created_at, updated_at, description
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // CSV header
    let csv = 'Name,Category,Amount,Currency,Billing Cycle,Next Billing Date,Status,Created At,Description\n';

    // CSV rows
    subscriptions.rows.forEach((sub) => {
      const row = [
        sub.name,
        sub.category,
        sub.amount || '',
        sub.currency,
        sub.billing_cycle,
        sub.next_billing_date?.toISOString().split('T')[0] || '',
        sub.status,
        sub.created_at.toISOString().split('T')[0],
        (sub.description || '').replace(/"/g, '""'), // Escape quotes
      ];

      csv += row.map((field) => `"${field}"`).join(',') + '\n';
    });

    return csv;
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
export const enhancedAnalyticsService = new EnhancedAnalyticsService();
