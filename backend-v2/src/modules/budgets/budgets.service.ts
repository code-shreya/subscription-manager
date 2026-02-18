import { db } from '../../config/database';
import { Budget } from '../../db/types';
import { notificationService } from '../notifications/notifications.service';

export interface BudgetInput {
  name: string;
  category?: string | null; // null = total budget, string = category-specific
  limit: number;
  currency: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  alert_threshold?: number; // Percentage (0-100)
  start_date?: string;
}

export interface BudgetStatus {
  budgetId: string;
  name: string;
  category: string | null;
  limit: number;
  spent: number;
  remaining: number;
  currency: string;
  period: string;
  percentage: number;
  status: 'under_budget' | 'near_limit' | 'at_limit' | 'over_budget';
  alertThreshold: number;
  subscriptions: Array<{
    id: string;
    name: string;
    amount: number;
    billingCycle: string;
  }>;
  projectedSpend?: number; // Estimated spend for the period
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  threshold: number;
  currentPercentage: number;
  spent: number;
  limit: number;
  currency: string;
}

/**
 * Budget Service
 * Manages budgets with real-time spending tracking and alerts
 */
export class BudgetService {
  /**
   * Create a new budget
   */
  async createBudget(userId: string, input: BudgetInput): Promise<Budget> {
    const {
      name,
      category = null,
      limit,
      currency,
      period,
      alert_threshold = 80,
      start_date,
    } = input;

    // Validate: only one budget per category
    if (category) {
      const existing = await db.query<Budget>(
        `SELECT id FROM budgets
         WHERE user_id = $1 AND category = $2 AND status = 'active'
         LIMIT 1`,
        [userId, category]
      );

      if (existing.rows.length > 0) {
        throw new Error(`Budget already exists for category: ${category}`);
      }
    } else {
      // Check for existing total budget
      const existing = await db.query<Budget>(
        `SELECT id FROM budgets
         WHERE user_id = $1 AND category IS NULL AND status = 'active'
         LIMIT 1`,
        [userId]
      );

      if (existing.rows.length > 0) {
        throw new Error('Total budget already exists');
      }
    }

    const startDate = start_date ? new Date(start_date) : new Date();

    const result = await db.query<Budget>(
      `INSERT INTO budgets (
        user_id, name, category, amount, currency, period,
        warning_threshold, start_date, status, alert_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true)
      RETURNING *`,
      [userId, name, category, limit, currency, period, alert_threshold, startDate]
    );

    return result.rows[0];
  }

  /**
   * Get all budgets for a user
   */
  async getBudgets(userId: string, includeInactive: boolean = false): Promise<Budget[]> {
    let query = `
      SELECT id, user_id, name, category, amount, currency, period,
             warning_threshold, start_date, status, created_at, updated_at
      FROM budgets
      WHERE user_id = $1
    `;

    if (!includeInactive) {
      query += ` AND status = 'active'`;
    }

    query += ` ORDER BY category NULLS FIRST, created_at DESC`;

    const result = await db.query<Budget>(query, [userId]);
    return result.rows;
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(userId: string, budgetId: string): Promise<Budget | null> {
    const result = await db.query<Budget>(
      `SELECT id, user_id, name, category, amount, currency, period,
              warning_threshold, start_date, status, created_at, updated_at
       FROM budgets
       WHERE id = $1 AND user_id = $2`,
      [budgetId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update a budget
   */
  async updateBudget(
    userId: string,
    budgetId: string,
    updates: Partial<BudgetInput>
  ): Promise<Budget> {
    const budget = await this.getBudgetById(userId, budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const fields: string[] = [];
    const values: any[] = [budgetId, userId];
    let paramIndex = 3;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.limit !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(updates.limit);
    }
    if (updates.currency !== undefined) {
      fields.push(`currency = $${paramIndex++}`);
      values.push(updates.currency);
    }
    if (updates.period !== undefined) {
      fields.push(`period = $${paramIndex++}`);
      values.push(updates.period);
    }
    if (updates.alert_threshold !== undefined) {
      fields.push(`warning_threshold = $${paramIndex++}`);
      values.push(updates.alert_threshold);
    }
    if (updates.start_date !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      values.push(new Date(updates.start_date));
    }

    if (fields.length === 0) {
      return budget;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE budgets
      SET ${fields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query<Budget>(query, values);
    return result.rows[0];
  }

  /**
   * Delete (deactivate) a budget
   */
  async deleteBudget(userId: string, budgetId: string): Promise<void> {
    const result = await db.query(
      `UPDATE budgets
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [budgetId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Budget not found');
    }
  }

  /**
   * Get budget status with real-time spending
   */
  async getBudgetStatus(userId: string, budgetId: string): Promise<BudgetStatus> {
    const budget = await this.getBudgetById(userId, budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    // Calculate current period dates
    const { startDate, endDate } = this.getCurrentPeriodDates(
      budget.start_date,
      budget.period
    );

    // Get subscriptions matching this budget
    let subscriptionQuery = `
      SELECT id, name, amount, currency, billing_cycle
      FROM subscriptions
      WHERE user_id = $1 AND status = 'active'
    `;

    const queryParams: any[] = [userId];

    if (budget.category) {
      subscriptionQuery += ` AND category = $2`;
      queryParams.push(budget.category);
    }

    const subscriptionsResult = await db.query(subscriptionQuery, queryParams);
    const subscriptions = subscriptionsResult.rows;

    // Calculate spending for the current period
    let spent = 0;
    const subscriptionDetails: BudgetStatus['subscriptions'] = [];

    subscriptions.forEach((sub) => {
      const amount = parseFloat(sub.amount as any) || 0;
      const monthlyAmount = this.convertToMonthlyAmount(amount, sub.billing_cycle);

      // Calculate spending for the current budget period
      let periodSpending = 0;
      switch (budget.period) {
        case 'monthly':
          periodSpending = monthlyAmount;
          break;
        case 'quarterly':
          periodSpending = monthlyAmount * 3;
          break;
        case 'yearly':
          periodSpending = monthlyAmount * 12;
          break;
      }

      spent += periodSpending;

      subscriptionDetails.push({
        id: sub.id,
        name: sub.name,
        amount: periodSpending,
        billingCycle: sub.billing_cycle,
      });
    });

    const limit = parseFloat(budget.amount as any);
    const remaining = Math.max(0, limit - spent);
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    // Determine status
    let status: BudgetStatus['status'];
    const threshold = budget.warning_threshold || 80;

    if (percentage >= 100) {
      status = 'over_budget';
    } else if (percentage >= threshold) {
      status = 'near_limit';
    } else if (percentage >= threshold * 0.9) {
      status = 'at_limit';
    } else {
      status = 'under_budget';
    }

    // Project spending for the period (simple projection based on days elapsed)
    const now = new Date();
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    const totalDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.ceil(
      (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const projectedSpend = daysElapsed > 0 ? (spent / daysElapsed) * totalDays : spent;

    return {
      budgetId: budget.id,
      name: budget.name,
      category: budget.category,
      limit,
      spent,
      remaining,
      currency: budget.currency,
      period: budget.period,
      percentage: Math.round(percentage * 10) / 10,
      status,
      alertThreshold: threshold,
      subscriptions: subscriptionDetails.sort((a, b) => b.amount - a.amount),
      projectedSpend: Math.round(projectedSpend * 100) / 100,
    };
  }

  /**
   * Get status for all budgets
   */
  async getAllBudgetStatuses(userId: string): Promise<BudgetStatus[]> {
    const budgets = await this.getBudgets(userId);
    const statuses: BudgetStatus[] = [];

    for (const budget of budgets) {
      const status = await this.getBudgetStatus(userId, budget.id);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Check budgets and send alerts if thresholds exceeded
   */
  async checkBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
    const budgets = await this.getBudgets(userId);
    const alerts: BudgetAlert[] = [];

    for (const budget of budgets) {
      const status = await this.getBudgetStatus(userId, budget.id);
      const threshold = budget.warning_threshold || 80;

      // Send alert if threshold exceeded and not already alerted recently
      if (status.percentage >= threshold) {
        const lastAlert = await db.query(
          `SELECT created_at FROM notifications
           WHERE user_id = $1
             AND notification_type = 'budget_alert'
             AND metadata->>'budgetId' = $2
             AND created_at >= CURRENT_DATE - INTERVAL '1 day'
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, budget.id]
        );

        // Only send alert if no alert sent in the last 24 hours
        if (lastAlert.rows.length === 0) {
          await notificationService.createBudgetAlertNotification(
            userId,
            budget.name,
            status.spent,
            status.limit,
            budget.currency
          );

          alerts.push({
            budgetId: budget.id,
            budgetName: budget.name,
            threshold,
            currentPercentage: status.percentage,
            spent: status.spent,
            limit: status.limit,
            currency: budget.currency,
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Get current period dates based on budget start date and period
   */
  private getCurrentPeriodDates(
    startDate: Date,
    period: string
  ): { startDate: Date; endDate: Date } {
    const start = new Date(startDate);
    const now = new Date();

    // Find the current period start
    let periodStart = new Date(start);

    switch (period) {
      case 'monthly': {
        // Find the most recent period start
        while (periodStart.getTime() <= now.getTime()) {
          const nextPeriod = new Date(periodStart);
          nextPeriod.setMonth(nextPeriod.getMonth() + 1);
          if (nextPeriod.getTime() > now.getTime()) {
            break;
          }
          periodStart = nextPeriod;
        }
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        return { startDate: periodStart, endDate: periodEnd };
      }

      case 'quarterly': {
        while (periodStart.getTime() <= now.getTime()) {
          const nextPeriod = new Date(periodStart);
          nextPeriod.setMonth(nextPeriod.getMonth() + 3);
          if (nextPeriod.getTime() > now.getTime()) {
            break;
          }
          periodStart = nextPeriod;
        }
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        return { startDate: periodStart, endDate: periodEnd };
      }

      case 'yearly': {
        while (periodStart.getTime() <= now.getTime()) {
          const nextPeriod = new Date(periodStart);
          nextPeriod.setFullYear(nextPeriod.getFullYear() + 1);
          if (nextPeriod.getTime() > now.getTime()) {
            break;
          }
          periodStart = nextPeriod;
        }
        const periodEnd = new Date(periodStart);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        return { startDate: periodStart, endDate: periodEnd };
      }

      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  /**
   * Convert any billing cycle to monthly amount
   */
  private convertToMonthlyAmount(amount: number, billingCycle: string): number {
    switch (billingCycle) {
      case 'daily':
        return amount * 30;
      case 'weekly':
        return amount * 4.33;
      case 'monthly':
        return amount;
      case 'quarterly':
        return amount / 3;
      case 'yearly':
        return amount / 12;
      case 'one-time':
        return 0;
      default:
        return amount;
    }
  }

  /**
   * Get budget summary for dashboard
   */
  async getBudgetSummary(userId: string): Promise<{
    totalBudgets: number;
    activeBudgets: number;
    budgetsNearLimit: number;
    budgetsOverLimit: number;
    totalLimit: number;
    totalSpent: number;
    currency: string;
  }> {
    const budgets = await this.getBudgets(userId);
    const statuses = await this.getAllBudgetStatuses(userId);

    let totalLimit = 0;
    let totalSpent = 0;
    let budgetsNearLimit = 0;
    let budgetsOverLimit = 0;
    const currency = budgets[0]?.currency || 'INR';

    statuses.forEach((status) => {
      // Only sum monthly budgets for total (to avoid double-counting)
      if (status.period === 'monthly') {
        totalLimit += status.limit;
        totalSpent += status.spent;
      }

      if (status.status === 'over_budget') {
        budgetsOverLimit++;
      } else if (status.status === 'near_limit' || status.status === 'at_limit') {
        budgetsNearLimit++;
      }
    });

    return {
      totalBudgets: budgets.length,
      activeBudgets: budgets.filter((b) => b.status === 'active').length,
      budgetsNearLimit,
      budgetsOverLimit,
      totalLimit,
      totalSpent,
      currency,
    };
  }
}

// Export singleton instance
export const budgetService = new BudgetService();
