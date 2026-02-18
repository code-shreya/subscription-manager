import { Subscription } from '../../db/types';

/**
 * Email Templates
 * CRITICAL: Preserves exact HTML/CSS from original notificationService.js (lines 224-378)
 */

/**
 * Renewal reminder email template
 * Preserved from original implementation
 */
export function generateRenewalReminderEmail(
  subscription: Subscription,
  daysUntil: number
): { subject: string; html: string } {
  const amount = subscription.amount
    ? `${subscription.currency} ${parseFloat(subscription.amount as any).toFixed(2)}`
    : 'N/A';

  const formattedDate = subscription.next_billing_date
    ? new Date(subscription.next_billing_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const subject = `⏰ Renewal Reminder: ${subscription.name} ${daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil} days`}`;

  // EXACT HTML from original notificationService.js (lines 224-378)
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

  return { subject, html };
}

/**
 * Scan completed email template
 */
export function generateScanCompletedEmail(
  detected: number,
  autoImported: number
): { subject: string; html: string } {
  const subject = `📧 Email Scan Complete - ${detected} subscription${detected !== 1 ? 's' : ''} detected`;

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
    .stats {
      display: flex;
      gap: 20px;
      margin: 20px 0;
    }
    .stat-box {
      flex: 1;
      background: #f7fafc;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
    }
    .stat-number {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 14px;
      color: #4a5568;
      margin-top: 5px;
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
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #718096;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">💳 SubManager AI</div>
    <div style="font-size: 18px;">Scan Results</div>
  </div>

  <div class="content">
    <h2 style="color: #667eea; margin-top: 0;">✅ Email Scan Completed</h2>

    <p style="font-size: 18px; color: #4a5568;">
      Your email scan is complete! Here's what we found:
    </p>

    <div class="stats">
      <div class="stat-box">
        <div class="stat-number">${detected}</div>
        <div class="stat-label">Subscriptions Detected</div>
      </div>
      ${autoImported > 0 ? `
      <div class="stat-box">
        <div class="stat-number">${autoImported}</div>
        <div class="stat-label">Auto-Imported</div>
      </div>
      ` : ''}
    </div>

    <p style="color: #4a5568;">
      ${autoImported > 0
        ? `${autoImported} high-confidence subscription${autoImported !== 1 ? 's were' : ' was'} automatically imported to your account.`
        : 'Review the detected subscriptions in your dashboard and import the ones you want to track.'
      }
    </p>

    <div style="text-align: center;">
      <a href="http://localhost:5173" class="button">View Detected Subscriptions</a>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated notification from SubManager AI</p>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Price change email template
 */
export function generatePriceChangeEmail(
  subscriptionName: string,
  oldAmount: number,
  newAmount: number,
  currency: string
): { subject: string; html: string } {
  const change = newAmount - oldAmount;
  const direction = change > 0 ? 'increased' : 'decreased';
  const percentageChange = Math.abs((change / oldAmount) * 100).toFixed(1);

  const subject = `💰 Price ${direction}: ${subscriptionName}`;

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
    .price-comparison {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin: 30px 0;
    }
    .price {
      font-size: 32px;
      font-weight: bold;
      color: #4a5568;
    }
    .arrow {
      font-size: 40px;
      color: ${change > 0 ? '#f56565' : '#48bb78'};
    }
    .change-badge {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: bold;
      background: ${change > 0 ? '#fff5f5' : '#f0fff4'};
      color: ${change > 0 ? '#c53030' : '#2f855a'};
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
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #718096;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">💳 SubManager AI</div>
    <div style="font-size: 18px;">Price Change Alert</div>
  </div>

  <div class="content">
    <h2 style="color: #667eea; margin-top: 0;">💰 Price ${direction}: ${subscriptionName}</h2>

    <p style="font-size: 18px; color: #4a5568;">
      The price for <strong>${subscriptionName}</strong> has ${direction}.
    </p>

    <div class="price-comparison">
      <div class="price">${currency} ${oldAmount.toFixed(2)}</div>
      <div class="arrow">${change > 0 ? '→' : '→'}</div>
      <div class="price">${currency} ${newAmount.toFixed(2)}</div>
    </div>

    <div style="text-align: center;">
      <span class="change-badge">
        ${change > 0 ? '+' : ''}${currency} ${Math.abs(change).toFixed(2)} (${percentageChange}%)
      </span>
    </div>

    <p style="color: #4a5568; margin-top: 30px;">
      ${change > 0
        ? 'Your next billing will reflect this price increase. Review your subscription to ensure it still fits your budget.'
        : 'Good news! Your subscription costs less now. This will be reflected in your next billing.'
      }
    </p>

    <div style="text-align: center;">
      <a href="http://localhost:5173" class="button">View Subscription</a>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated notification from SubManager AI</p>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Budget alert email template
 */
export function generateBudgetAlertEmail(
  budgetName: string,
  spent: number,
  limit: number,
  currency: string
): { subject: string; html: string } {
  const percentage = (spent / limit) * 100;
  const remaining = limit - spent;

  const subject = `🚨 Budget Alert: ${budgetName} (${percentage.toFixed(0)}%)`;

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
    .progress-bar {
      width: 100%;
      height: 30px;
      background: #e2e8f0;
      border-radius: 15px;
      overflow: hidden;
      margin: 20px 0;
    }
    .progress-fill {
      height: 100%;
      background: ${percentage >= 90 ? '#f56565' : percentage >= 75 ? '#ed8936' : '#48bb78'};
      transition: width 0.3s ease;
    }
    .budget-stats {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 14px;
      color: #4a5568;
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
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #718096;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">💳 SubManager AI</div>
    <div style="font-size: 18px;">Budget Alert</div>
  </div>

  <div class="content">
    <h2 style="color: #667eea; margin-top: 0;">🚨 Budget Alert: ${budgetName}</h2>

    <p style="font-size: 18px; color: #4a5568;">
      You've spent <strong>${percentage.toFixed(0)}%</strong> of your ${budgetName} budget.
    </p>

    <div class="progress-bar">
      <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
    </div>

    <div class="budget-stats">
      <div class="stat">
        <div class="stat-value">${currency} ${spent.toFixed(2)}</div>
        <div class="stat-label">Spent</div>
      </div>
      <div class="stat">
        <div class="stat-value">${currency} ${remaining.toFixed(2)}</div>
        <div class="stat-label">Remaining</div>
      </div>
      <div class="stat">
        <div class="stat-value">${currency} ${limit.toFixed(2)}</div>
        <div class="stat-label">Limit</div>
      </div>
    </div>

    <p style="color: #4a5568;">
      ${percentage >= 100
        ? '⚠️ You have exceeded your budget limit!'
        : percentage >= 90
        ? '⚠️ You are approaching your budget limit. Consider reviewing your subscriptions.'
        : 'Monitor your spending to stay within budget.'
      }
    </p>

    <div style="text-align: center;">
      <a href="http://localhost:5173" class="button">Manage Budget</a>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated notification from SubManager AI</p>
  </div>
</body>
</html>
  `;

  return { subject, html };
}
