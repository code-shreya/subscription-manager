import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NotificationService {
  constructor() {
    this.transporter = null;
    this.notificationsPath = path.join(__dirname, '..', 'notifications.json');
    this.notifications = { sent: [], inApp: [] };
    this.emailConfig = null;
    this.configPath = path.join(__dirname, '..', 'email-config.json');
  }

  async initialize() {
    try {
      // Load notifications history
      await this.loadNotifications();

      // Load email configuration
      await this.loadEmailConfig();

      // Initialize email transporter if configured
      if (this.emailConfig && this.emailConfig.enabled) {
        this.setupTransporter();
      }

      console.log('✅ Notification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  async loadNotifications() {
    try {
      const data = await fs.readFile(this.notificationsPath, 'utf-8');
      this.notifications = JSON.parse(data);
    } catch (error) {
      // Create default notifications file
      this.notifications = {
        sent: [], // Email notifications that were sent
        inApp: [], // In-app notifications for the bell icon
      };
      await this.saveNotifications();
    }
  }

  async saveNotifications() {
    await fs.writeFile(this.notificationsPath, JSON.stringify(this.notifications, null, 2));
  }

  async loadEmailConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.emailConfig = JSON.parse(data);
    } catch (error) {
      // Create default email config
      this.emailConfig = {
        enabled: false,
        service: 'gmail', // gmail, outlook, custom
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: '', // User's email
          pass: '', // App password
        },
        from: '', // From email address
        remindAt: [7, 3, 1], // Days before renewal to send reminders
      };
      await this.saveEmailConfig();
    }
  }

  async saveEmailConfig() {
    await fs.writeFile(this.configPath, JSON.stringify(this.emailConfig, null, 2));
  }

  async updateEmailConfig(config) {
    this.emailConfig = { ...this.emailConfig, ...config };
    await this.saveEmailConfig();

    // Reinitialize transporter with new config
    if (this.emailConfig.enabled) {
      this.setupTransporter();
    }
  }

  getEmailConfig() {
    // Return config without sensitive password
    const { auth, ...safeConfig } = this.emailConfig;
    return {
      ...safeConfig,
      auth: {
        user: auth.user,
        pass: auth.pass ? '••••••••' : '',
      },
    };
  }

  setupTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: {
          user: this.emailConfig.auth.user,
          pass: this.emailConfig.auth.pass,
        },
      });

      console.log('✅ Email transporter configured');
    } catch (error) {
      console.error('❌ Failed to setup email transporter:', error);
    }
  }

  // Check for upcoming renewals and send reminders
  async checkRenewals(subscriptions) {
    if (!this.emailConfig.enabled || !this.transporter) {
      console.log('⏸️  Email reminders disabled or not configured');
      return { checked: subscriptions.length, sent: 0, inApp: 0 };
    }

    const now = new Date();
    const remindersToSend = [];
    const inAppNotifications = [];
    let emailsSent = 0;

    for (const sub of subscriptions) {
      if (!sub.next_billing_date || sub.status !== 'active') {
        continue;
      }

      const renewalDate = new Date(sub.next_billing_date);
      const daysUntil = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));

      // Check if we should remind for this subscription
      for (const reminderDay of this.emailConfig.remindAt) {
        if (daysUntil === reminderDay) {
          const notificationKey = `${sub.id}-${reminderDay}-${sub.next_billing_date}`;

          // Check if we already sent this notification
          const alreadySent = this.notifications.sent.some(n => n.key === notificationKey);

          if (!alreadySent) {
            remindersToSend.push({
              subscription: sub,
              daysUntil,
              notificationKey,
            });

            // Also create in-app notification
            inAppNotifications.push({
              id: Date.now() + Math.random(),
              type: 'renewal_reminder',
              title: `Renewal in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`,
              message: `${sub.name} will renew on ${new Date(sub.next_billing_date).toLocaleDateString()}`,
              subscription: {
                id: sub.id,
                name: sub.name,
                amount: sub.amount,
                currency: sub.currency,
              },
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
        }
      }
    }

    // Send email reminders
    for (const reminder of remindersToSend) {
      try {
        await this.sendRenewalEmail(reminder.subscription, reminder.daysUntil);

        // Mark as sent
        this.notifications.sent.push({
          key: reminder.notificationKey,
          subscriptionId: reminder.subscription.id,
          subscriptionName: reminder.subscription.name,
          daysUntil: reminder.daysUntil,
          sentAt: new Date().toISOString(),
        });

        emailsSent++;
        console.log(`✅ Sent renewal reminder for ${reminder.subscription.name} (${reminder.daysUntil} days)`);
      } catch (error) {
        console.error(`❌ Failed to send reminder for ${reminder.subscription.name}:`, error);
      }
    }

    // Add in-app notifications
    this.notifications.inApp = [...inAppNotifications, ...this.notifications.inApp];

    // Save notifications
    await this.saveNotifications();

    return {
      checked: subscriptions.length,
      sent: emailsSent,
      inApp: inAppNotifications.length,
    };
  }

  async sendRenewalEmail(subscription, daysUntil) {
    const renewalDate = new Date(subscription.next_billing_date);
    const formattedDate = renewalDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const amount = subscription.amount ? `₹${subscription.amount}` : 'Amount not specified';

    const subject = `⏰ Reminder: ${subscription.name} renews in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      padding: 30px;
      color: white;
    }
    .content {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-top: 20px;
      color: #333;
    }
    .header {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .amount {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      margin: 20px 0;
    }
    .details {
      background: #f7fafc;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #4a5568;
    }
    .value {
      color: #1a202c;
      font-weight: 500;
    }
    .urgent {
      background: #fff5f5;
      border: 2px solid #fc8181;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      color: #c53030;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #718096;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 30px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: bold;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">💳 SubManager AI</div>
    <div style="font-size: 18px;">Renewal Reminder</div>
  </div>

  <div class="content">
    <h2 style="color: #667eea; margin-top: 0;">⏰ Upcoming Renewal Alert</h2>

    ${daysUntil <= 1 ? `
    <div class="urgent">
      🔥 ${daysUntil === 0 ? 'RENEWS TODAY!' : 'RENEWS TOMORROW!'}
    </div>
    ` : ''}

    <p style="font-size: 18px; color: #4a5568;">
      Your subscription to <strong>${subscription.name}</strong> is set to renew ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}.
    </p>

    <div class="amount">${amount}</div>

    <div class="details">
      <div class="detail-row">
        <span class="label">Service</span>
        <span class="value">${subscription.name}</span>
      </div>
      <div class="detail-row">
        <span class="label">Category</span>
        <span class="value">${subscription.category}</span>
      </div>
      <div class="detail-row">
        <span class="label">Billing Cycle</span>
        <span class="value">${subscription.billing_cycle || 'Monthly'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Renewal Date</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="detail-row">
        <span class="label">Days Until Renewal</span>
        <span class="value">${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}</span>
      </div>
    </div>

    ${subscription.description ? `
    <div style="background: #edf2f7; padding: 15px; border-radius: 10px; margin: 20px 0;">
      <strong>Note:</strong> ${subscription.description}
    </div>
    ` : ''}

    <p style="color: #4a5568;">
      Make sure you have sufficient funds in your account to avoid service interruption.
      If you want to cancel this subscription, please do so before the renewal date.
    </p>

    <div style="text-align: center;">
      <a href="http://localhost:5173" class="button">View in SubManager</a>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated reminder from SubManager AI</p>
    <p>💡 You can configure reminder settings in the app</p>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"SubManager AI" <${this.emailConfig.from || this.emailConfig.auth.user}>`,
      to: this.emailConfig.auth.user,
      subject: subject,
      html: html,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Get in-app notifications
  getInAppNotifications() {
    return this.notifications.inApp.filter(n => !n.read).slice(0, 50);
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    const notification = this.notifications.inApp.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotifications();
    }
  }

  // Mark all as read
  async markAllAsRead() {
    this.notifications.inApp.forEach(n => n.read = true);
    await this.saveNotifications();
  }

  // Get sent email history
  getSentHistory(limit = 50) {
    return this.notifications.sent.slice(0, limit);
  }

  // Create in-app notification
  async createNotification(type, title, message, subscription = null) {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      subscription,
      createdAt: new Date().toISOString(),
      read: false,
    };

    this.notifications.inApp.unshift(notification);
    await this.saveNotifications();

    return notification;
  }

  // Create notification for scan completed
  async notifyScanCompleted(detected, autoImported) {
    const title = autoImported > 0
      ? `📧 Scan Complete: ${detected} found, ${autoImported} imported`
      : `📧 Scan Complete: ${detected} subscriptions detected`;

    const message = autoImported > 0
      ? `${autoImported} confirmed subscriptions were automatically imported`
      : detected > 0
      ? `Review the detected subscriptions in Email Scanner`
      : `No new subscriptions found in your emails`;

    return await this.createNotification('scan_completed', title, message);
  }

  // Create notification for auto-imported subscription
  async notifyAutoImport(subscriptionName, amount, currency) {
    const amountStr = amount ? `₹${amount}` : 'Amount not specified';
    return await this.createNotification(
      'auto_imported',
      `🤖 Auto-imported: ${subscriptionName}`,
      `${subscriptionName} (${amountStr}) was automatically added to your subscriptions`,
      { name: subscriptionName, amount, currency }
    );
  }

  // Create notification for new subscription detected
  async notifyNewSubscription(subscriptionName, confidence) {
    return await this.createNotification(
      'new_subscription',
      `✨ New subscription detected`,
      `${subscriptionName} found with ${confidence}% confidence. Review in Email Scanner.`,
      { name: subscriptionName }
    );
  }
}

export default new NotificationService();
