# Analytics & Notifications (Week 7)

This document explains the advanced analytics and notification system implemented in Week 7.

## Overview

Week 7 adds:
- **Advanced Analytics** with trends, YoY comparison, price change tracking, and AI insights
- **Async Notification System** with BullMQ for reliable email delivery
- **Beautiful Email Templates** (preserved from original implementation)
- **CSV Export** functionality for subscriptions

## Architecture

```
User Request → Analytics Service → PostgreSQL
                     ↓
               Complex Analysis (trends, insights, patterns)
                     ↓
                Return Results


User Action → Notification Service → BullMQ Queue
                                          ↓
                                  Notification Worker
                                          ↓
                                  Send Email (async)
                                          ↓
                                 Update Notification Status
```

## Enhanced Analytics Features

### 1. Analytics Overview
GET /api/analytics/overview

```json
{
  "totalMonthly": "1234.56",
  "totalYearly": "14814.72",
  "totalSubscriptions": 12,
  "subscriptionsWithAmount": 10,
  "subscriptionsWithoutAmount": 2,
  "categoryBreakdown": [
    {
      "category": "Streaming",
      "count": 3,
      "monthly_amount": 450.00
    }
  ],
  "upcomingRenewals": [...]
}
```

### 2. Spending Trends (with YoY comparison)
GET /api/analytics/trends?months=12&granularity=monthly

```json
[
  {
    "period": "2026-02",
    "amount": 1234.56,
    "count": 12,
    "change": 15.5  // Percentage change from previous month
  },
  {
    "period": "2026-01",
    "amount": 1067.45,
    "count": 11,
    "change": -5.2
  }
]
```

**Parameters:**
- `months`: Number of months to analyze (default: 12)
- `granularity`: `monthly` | `quarterly` | `yearly` (default: monthly)

### 3. Price Changes
GET /api/analytics/price-changes?limit=10

Tracks subscription price changes over time from `subscription_price_history` table.

```json
[
  {
    "subscriptionId": "sub-123",
    "subscriptionName": "Netflix Premium",
    "category": "Streaming",
    "oldAmount": 499,
    "newAmount": 649,
    "changedAt": "2026-01-15T00:00:00Z",
    "percentageChange": 30.06
  }
]
```

### 4. AI-Powered Insights
GET /api/analytics/insights

Generates actionable insights:

```json
[
  {
    "type": "duplicate",
    "severity": "high",
    "title": "Duplicate subscription detected: Spotify",
    "description": "You have 2 active subscriptions for Spotify",
    "impact": "Potential monthly savings: INR 119.00",
    "actionable": true,
    "metadata": {
      "subscriptions": ["sub-1", "sub-2"]
    }
  },
  {
    "type": "expensive",
    "severity": "medium",
    "title": "High-cost subscription: Adobe Creative Cloud",
    "description": "Adobe Creative Cloud costs USD 54.99/month",
    "impact": "Annual cost: USD 659.88",
    "actionable": true,
    "metadata": {
      "subscriptionId": "sub-3",
      "monthlyAmount": 54.99
    }
  },
  {
    "type": "rarely_used",
    "severity": "low",
    "title": "Rarely used: Gym Membership",
    "description": "Only 1 email detected in the past year",
    "impact": "Consider cancelling if not actively used",
    "actionable": true,
    "metadata": {
      "subscriptionId": "sub-4"
    }
  }
]
```

**Insight Types:**
- `duplicate` - Same subscription found multiple times
- `expensive` - Subscription costs > threshold (₹500/month)
- `rarely_used` - Low email detection count (<3 emails/year)
- `savings` - Potential savings opportunities
- `trend` - Spending increased significantly

### 5. Yearly Patterns
GET /api/analytics/yearly-patterns

Analyzes patterns from detected subscriptions (preserves logic from original `analysisService.js`):

```json
{
  "totalFound": 45,
  "uniqueServices": 12,
  "byCategory": {
    "Streaming": 15,
    "Music": 8,
    "Investment": 5
  },
  "byMonth": {
    "Jan": 4,
    "Feb": 6,
    "Mar": 3
  },
  "byCurrency": {
    "INR": 38,
    "USD": 7
  },
  "byBillingCycle": {
    "monthly": 32,
    "yearly": 10,
    "quarterly": 3
  },
  "averageConfidence": 85,
  "estimatedAnnualCost": 48500,
  "topServices": [
    { "name": "Netflix", "detectionCount": 12 },
    { "name": "Spotify", "detectionCount": 8 }
  ],
  "cancelSuggestions": [
    {
      "service": "Premium Gym",
      "reason": "Rarely used (few emails detected)",
      "monthlyAmount": 2000,
      "currency": "INR",
      "annualSavings": 24000
    }
  ]
}
```

### 6. CSV Export
GET /api/analytics/export

Downloads subscriptions as CSV file:

```csv
Name,Category,Amount,Currency,Billing Cycle,Next Billing Date,Status,Created At,Description
"Netflix Premium","Streaming","649","INR","monthly","2026-03-15","active","2025-01-10",""
"Spotify Premium","Music","119","INR","monthly","2026-02-28","active","2025-01-05",""
```

### 7. Most Expensive
GET /api/analytics/expensive?limit=5

Returns top N most expensive subscriptions (by amount).

### 8. Category Breakdown
GET /api/analytics/categories

Returns category breakdown with counts and monthly spend per category.

## Notification System

### Notification Types

1. **Renewal Reminder** (`renewal_reminder`)
   - Sent X days before subscription renewal
   - Beautiful gradient email template (preserved from original)
   - Includes subscription details, amount, renewal date
   - Urgent styling for renewals within 24 hours

2. **Scan Completed** (`scan_completed`)
   - Sent after email scan completes
   - Shows detected and auto-imported counts
   - Links to review detected subscriptions

3. **Auto Import** (`auto_import`)
   - In-app notification only (not emailed)
   - Confirms subscription was auto-imported

4. **Price Change** (`price_change`)
   - Sent when subscription price changes
   - Shows old vs new price with percentage change
   - Different styling for increases vs decreases

5. **Budget Alert** (`budget_alert`)
   - Sent when approaching/exceeding budget
   - Progress bar visualization in email
   - Shows spent, remaining, and total

### Creating Notifications

```typescript
import { notificationService } from './modules/notifications/notifications.service';

// Create renewal reminder (sends email + in-app)
await notificationService.createRenewalReminder(
  userId,
  subscription,
  daysUntilRenewal
);

// Create scan completed notification
await notificationService.createScanCompletedNotification(
  userId,
  detected: 15,
  autoImported: 3
);

// Create price change notification
await notificationService.createPriceChangeNotification(
  userId,
  'Netflix Premium',
  499,  // old amount
  649,  // new amount
  'INR'
);

// Create budget alert
await notificationService.createBudgetAlertNotification(
  userId,
  'Entertainment',
  850,   // spent
  1000,  // limit
  'INR'
);
```

### Notification API Endpoints

#### Get Notifications
GET /api/notifications?limit=20&unreadOnly=false

```json
[
  {
    "id": "notif-123",
    "userId": "user-456",
    "notificationType": "renewal_reminder",
    "title": "Upcoming Renewal: Netflix Premium",
    "message": "Your Netflix Premium subscription will renew in 3 days...",
    "metadata": {
      "subscriptionId": "sub-789",
      "daysUntilRenewal": 3
    },
    "status": "sent",
    "isRead": false,
    "createdAt": "2026-02-15T10:30:00Z",
    "readAt": null
  }
]
```

#### Get Unread Count
GET /api/notifications/unread-count

```json
{
  "count": 5
}
```

#### Mark as Read
PATCH /api/notifications/:id/read

#### Mark All as Read
PATCH /api/notifications/read-all

#### Delete Notification
DELETE /api/notifications/:id

### Email Templates

All email templates use the **preserved design** from original `notificationService.js` (lines 224-378):

- **Gradient header** (#667eea to #764ba2)
- **Clean white content card**
- **Responsive design** (max-width: 600px)
- **Professional typography** (system fonts)
- **Urgent alerts** for critical notifications
- **Call-to-action buttons** linking back to app

Example HTML structure:
```html
<div class="container">
  <div class="header">💳 SubManager AI</div>
  <div class="content">
    <!-- Notification content -->
  </div>
  <div class="footer">
    <!-- Footer text -->
  </div>
</div>
```

### Async Email Sending

Emails are sent asynchronously via BullMQ:

1. **Notification created** → Stored in `notifications` table
2. **Job queued** → Added to `notification-email` queue
3. **Worker processes** → `notification-email.worker.ts` picks up job
4. **Email sent** → Via email service (SendGrid/AWS SES)
5. **Status updated** → Notification marked as `sent` or `failed`

**Benefits:**
- Non-blocking API responses
- Automatic retries (3 attempts with exponential backoff)
- Failed email tracking for debugging
- Scalable (multiple workers can process concurrently)

### Email Service Integration

To enable actual email sending, configure an email service:

```typescript
// In notification-email.worker.ts (line 89)
// TODO: Integrate with email service

// Example with SendGrid:
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: user.email,
  from: 'noreply@submanager.com',
  subject: emailData.subject,
  html: emailData.html,
});

// Example with AWS SES:
import AWS from 'aws-sdk';
const ses = new AWS.SES({ region: 'us-east-1' });

await ses.sendEmail({
  Source: 'noreply@submanager.com',
  Destination: { ToAddresses: [user.email] },
  Message: {
    Subject: { Data: emailData.subject },
    Body: { Html: { Data: emailData.html } }
  }
}).promise();
```

## Comparison: Before vs After

### Before (Week 6)
- ❌ Basic analytics (monthly/yearly totals only)
- ❌ No spending trends or predictions
- ❌ No price change tracking
- ❌ No AI-powered insights
- ❌ No notification system
- ❌ No export functionality

### After (Week 7)
- ✅ Advanced analytics with trends
- ✅ YoY comparison and percentage changes
- ✅ Price change tracking from history table
- ✅ AI insights: duplicates, expensive, rarely used
- ✅ Yearly pattern analysis (preserved from original)
- ✅ Async notification system with BullMQ
- ✅ Beautiful email templates (preserved design)
- ✅ Multi-channel notifications (email + in-app)
- ✅ CSV export for data portability

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  sent_at TIMESTAMP
);
```

### Subscription Price History Table
```sql
CREATE TABLE subscription_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  old_amount DECIMAL(10, 2),
  new_amount DECIMAL(10, 2) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Analytics Testing
```bash
# Get overview
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/analytics/overview

# Get spending trends
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/analytics/trends?months=6"

# Get insights
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/analytics/insights

# Export to CSV
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/analytics/export \
  -o subscriptions.csv
```

### Notification Testing
```bash
# Get notifications
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/notifications

# Get unread count
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/notifications/unread-count

# Mark as read
curl -X PATCH -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/notifications/<id>/read
```

## Next Steps

Week 8 will build on this foundation with:
- Budget management system
- Real-time budget tracking
- Budget threshold alerts (using notification system)
- Budget analytics and forecasting
