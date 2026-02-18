import { db } from '../../config/database';
import { Notification, Subscription } from '../../db/types';

export interface NotificationData {
  userId: string;
  type: 'renewal_reminder' | 'scan_completed' | 'auto_import' | 'price_change' | 'budget_alert';
  title: string;
  message: string;
  metadata?: any;
  channels?: ('email' | 'push' | 'in_app')[];
}

/**
 * Notification Service
 * Handles creation and retrieval of notifications
 * Email sending is delegated to BullMQ notification worker
 */
export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(data: NotificationData): Promise<string> {
    const { userId, type, title, message, metadata = {}, channels = ['in_app'] } = data;

    const result = await db.query<Notification>(
      `INSERT INTO notifications (
        user_id, type, channel, title, message, metadata, status
      )
      VALUES ($1, $2, 'in_app', $3, $4, $5, 'pending')
      RETURNING id`,
      [userId, type, title, message, JSON.stringify(metadata)]
    );

    const notificationId = result.rows[0].id;

    // Queue email sending if email channel is enabled
    if (channels.includes('email')) {
      const { queueNotificationEmail } = await import('../../jobs/queue.notifications');
      await queueNotificationEmail({
        notificationId,
        userId,
        type,
        title,
        message,
        metadata,
      });
    }

    return notificationId;
  }

  /**
   * Create renewal reminder notification
   */
  async createRenewalReminder(
    userId: string,
    subscription: Subscription,
    daysUntilRenewal: number
  ): Promise<string> {
    const amount = subscription.amount
      ? `${subscription.currency} ${parseFloat(subscription.amount as any).toFixed(2)}`
      : 'N/A';

    const title = `Upcoming Renewal: ${subscription.name}`;
    const message = `Your ${subscription.name} subscription will renew in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''} on ${subscription.next_billing_date?.toLocaleDateString()}. Amount: ${amount}`;

    return this.createNotification({
      userId,
      type: 'renewal_reminder',
      title,
      message,
      metadata: {
        subscriptionId: subscription.id,
        subscriptionName: subscription.name,
        amount: subscription.amount,
        currency: subscription.currency,
        nextBillingDate: subscription.next_billing_date,
        daysUntilRenewal,
      },
      channels: ['email', 'in_app'],
    });
  }

  /**
   * Create scan completed notification
   */
  async createScanCompletedNotification(
    userId: string,
    detected: number,
    autoImported: number = 0
  ): Promise<string> {
    const title = 'Email Scan Completed';
    const message = `Scan complete! ${detected} subscription${detected !== 1 ? 's' : ''} detected${autoImported > 0 ? `, ${autoImported} auto-imported` : ''}`;

    return this.createNotification({
      userId,
      type: 'scan_completed',
      title,
      message,
      metadata: { detected, autoImported },
      channels: ['email', 'in_app'],
    });
  }

  /**
   * Create auto-import notification
   */
  async createAutoImportNotification(
    userId: string,
    serviceName: string,
    amount: number | null,
    currency: string
  ): Promise<string> {
    const title = `Auto-imported: ${serviceName}`;
    const amountStr = amount ? `${currency} ${amount.toFixed(2)}` : 'N/A';
    const message = `${serviceName} was automatically added to your subscriptions (${amountStr})`;

    return this.createNotification({
      userId,
      type: 'auto_import',
      title,
      message,
      metadata: { serviceName, amount, currency },
      channels: ['in_app'],
    });
  }

  /**
   * Create price change notification
   */
  async createPriceChangeNotification(
    userId: string,
    subscriptionName: string,
    oldAmount: number,
    newAmount: number,
    currency: string
  ): Promise<string> {
    const change = newAmount - oldAmount;
    const direction = change > 0 ? 'increased' : 'decreased';
    const title = `Price ${direction}: ${subscriptionName}`;
    const message = `${subscriptionName} price ${direction} from ${currency} ${oldAmount.toFixed(2)} to ${currency} ${newAmount.toFixed(2)}`;

    return this.createNotification({
      userId,
      type: 'price_change',
      title,
      message,
      metadata: { subscriptionName, oldAmount, newAmount, currency, change },
      channels: ['email', 'in_app'],
    });
  }

  /**
   * Create budget alert notification
   */
  async createBudgetAlertNotification(
    userId: string,
    budgetName: string,
    spent: number,
    limit: number,
    currency: string
  ): Promise<string> {
    const percentage = (spent / limit) * 100;
    const title = `Budget Alert: ${budgetName}`;
    const message = `You've spent ${currency} ${spent.toFixed(2)} of ${currency} ${limit.toFixed(2)} (${percentage.toFixed(0)}%) for ${budgetName}`;

    return this.createNotification({
      userId,
      type: 'budget_alert',
      title,
      message,
      metadata: { budgetName, spent, limit, currency, percentage },
      channels: ['email', 'in_app'],
    });
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    let query = `
      SELECT id, user_id, type AS notification_type, title, message, metadata,
             status, (read_at IS NOT NULL) AS is_read, created_at, read_at
      FROM notifications
      WHERE user_id = $1
    `;

    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC LIMIT $2';

    const result = await db.query<Notification>(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await db.query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await db.query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await db.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
