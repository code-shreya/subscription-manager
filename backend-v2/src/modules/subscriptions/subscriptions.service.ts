import { db } from '../../config/database';
import { Subscription } from '../../db/types';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from '../../shared/schemas/subscription.schema';

/**
 * Subscription Service
 * Handles all subscription-related business logic
 */
export class SubscriptionService {
  /**
   * Get all subscriptions for a user
   */
  async getAllSubscriptions(
    userId: string,
    filters?: {
      status?: string;
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Subscription[]> {
    let query = `
      SELECT id, user_id, name, category, amount, currency, billing_cycle,
             next_billing_date, status, description, website_url, logo_url,
             reminder_days_before, source, notes, tags, created_at, updated_at
      FROM subscriptions
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // Add filters
    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }

    // Add ordering
    query += ' ORDER BY created_at DESC';

    // Add pagination
    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await db.query<Subscription>(query, params);
    return result.rows;
  }

  /**
   * Get a single subscription by ID
   */
  async getSubscriptionById(userId: string, subscriptionId: string): Promise<Subscription> {
    const result = await db.query<Subscription>(
      `SELECT id, user_id, name, category, amount, currency, billing_cycle,
              next_billing_date, status, description, website_url, logo_url,
              reminder_days_before, source, notes, tags, created_at, updated_at
       FROM subscriptions
       WHERE id = $1 AND user_id = $2`,
      [subscriptionId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Subscription not found');
    }

    return result.rows[0];
  }

  /**
   * Create a new subscription
   */
  async createSubscription(userId: string, input: CreateSubscriptionInput): Promise<Subscription> {
    const result = await db.query<Subscription>(
      `INSERT INTO subscriptions (
        user_id, name, category, amount, currency, billing_cycle,
        next_billing_date, description, website_url, reminder_days_before,
        notes, tags, status, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', 'manual')
      RETURNING id, user_id, name, category, amount, currency, billing_cycle,
                next_billing_date, status, description, website_url, logo_url,
                reminder_days_before, source, notes, tags, created_at, updated_at`,
      [
        userId,
        input.name,
        input.category,
        input.amount || null,
        input.currency || 'INR',
        input.billing_cycle,
        input.next_billing_date || null,
        input.description || null,
        input.website_url || null,
        input.reminder_days_before !== undefined ? input.reminder_days_before : 3,
        input.notes || null,
        input.tags ? JSON.stringify(input.tags) : null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    userId: string,
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<Subscription> {
    // First check if subscription exists and belongs to user
    await this.getSubscriptionById(userId, subscriptionId);

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }

    if (input.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(input.category);
    }

    if (input.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(input.amount);
    }

    if (input.currency !== undefined) {
      fields.push(`currency = $${paramIndex++}`);
      values.push(input.currency);
    }

    if (input.billing_cycle !== undefined) {
      fields.push(`billing_cycle = $${paramIndex++}`);
      values.push(input.billing_cycle);
    }

    if (input.next_billing_date !== undefined) {
      fields.push(`next_billing_date = $${paramIndex++}`);
      values.push(input.next_billing_date);
    }

    if (input.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }

    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }

    if (input.website_url !== undefined) {
      fields.push(`website_url = $${paramIndex++}`);
      values.push(input.website_url);
    }

    if (input.reminder_days_before !== undefined) {
      fields.push(`reminder_days_before = $${paramIndex++}`);
      values.push(input.reminder_days_before);
    }

    if (input.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(input.notes);
    }

    if (input.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(input.tags ? JSON.stringify(input.tags) : null);
    }

    if (fields.length === 0) {
      // No fields to update, return current subscription
      return this.getSubscriptionById(userId, subscriptionId);
    }

    // Add updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');

    // Add WHERE clause parameters
    values.push(subscriptionId, userId);

    const result = await db.query<Subscription>(
      `UPDATE subscriptions
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING id, user_id, name, category, amount, currency, billing_cycle,
                 next_billing_date, status, description, website_url, logo_url,
                 reminder_days_before, source, notes, tags, created_at, updated_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(userId: string, subscriptionId: string): Promise<void> {
    // First check if subscription exists and belongs to user
    await this.getSubscriptionById(userId, subscriptionId);

    await db.query('DELETE FROM subscriptions WHERE id = $1 AND user_id = $2', [
      subscriptionId,
      userId,
    ]);
  }

  /**
   * Get subscription count by status
   */
  async getSubscriptionCounts(userId: string): Promise<Record<string, number>> {
    const result = await db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text as count
       FROM subscriptions
       WHERE user_id = $1
       GROUP BY status`,
      [userId]
    );

    const counts: Record<string, number> = {
      active: 0,
      cancelled: 0,
      expired: 0,
      paused: 0,
    };

    result.rows.forEach((row) => {
      counts[row.status] = parseInt(row.count, 10);
    });

    return counts;
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
