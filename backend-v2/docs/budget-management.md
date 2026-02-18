# Budget Management System (Week 8)

This document explains the complete budget management system implemented in Week 8.

## Overview

Week 8 adds a comprehensive budget management system with:
- **Budget CRUD** (per-category and total budgets)
- **Real-time Spending Tracking** against budgets
- **Automatic Alerts** when approaching/exceeding limits
- **Budget Status Visualization** with projections
- **Scheduled Budget Checks** (daily via BullMQ)

## Architecture

```
User Creates Budget → PostgreSQL (budgets table)
                           ↓
              Track Active Subscriptions
                           ↓
              Calculate Current Spending
                           ↓
              Compare to Budget Limit
                           ↓
         Threshold Exceeded? → Send Alert (via Notification Service)
                           ↓
              BullMQ Daily Job (10 AM)
```

## Features

### 1. Budget Types

**Category Budget:**
- Tracks spending for a specific category (e.g., "Streaming", "Music")
- Only one budget per category allowed
- Useful for controlling spending in specific areas

**Total Budget:**
- Tracks overall subscription spending
- Only one total budget allowed per user
- Covers all categories

### 2. Budget Periods

- `monthly` - Budget resets every month
- `quarterly` - Budget resets every 3 months
- `yearly` - Budget resets every 12 months

### 3. Real-Time Spending Calculation

The system automatically calculates spending by:
1. Finding all active subscriptions matching the budget (category or all)
2. Converting each subscription's billing cycle to the budget period
3. Summing up the amounts
4. Comparing against the budget limit

**Example:**
- Budget: ₹1000/month for "Streaming"
- Subscriptions:
  - Netflix: ₹649/month
  - Disney+: ₹299/month
- **Total Spent:** ₹948/month (94.8% of budget)

### 4. Budget Status

Four status levels:
- `under_budget` - Below alert threshold (safe)
- `at_limit` - Near alert threshold (90% of threshold)
- `near_limit` - At or above alert threshold
- `over_budget` - Exceeded 100% of limit

### 5. Spending Projections

The system projects spending for the current period based on:
- Days elapsed in the current period
- Current spending rate
- Formula: `projected = (spent / days_elapsed) * total_days_in_period`

**Example:**
- Budget: ₹3000/quarter
- 30 days into quarter (out of 90 days)
- Spent: ₹1200
- **Projected:** (1200 / 30) * 90 = ₹3600 (over budget!)

## API Endpoints

### Create Budget
POST /api/budgets

```json
{
  "name": "Streaming Budget",
  "category": "Streaming",  // null for total budget
  "limit": 1000,
  "currency": "INR",
  "period": "monthly",
  "alert_threshold": 80,  // Alert at 80% (optional, default: 80)
  "start_date": "2026-01-01"  // optional, default: today
}
```

**Response (201):**
```json
{
  "id": "budget-123",
  "user_id": "user-456",
  "name": "Streaming Budget",
  "category": "Streaming",
  "amount": 1000,
  "currency": "INR",
  "period": "monthly",
  "warning_threshold": 80,
  "start_date": "2026-01-01T00:00:00Z",
  "status": "active",
  "alert_enabled": true,
  "created_at": "2026-02-18T10:00:00Z",
  "updated_at": "2026-02-18T10:00:00Z"
}
```

**Errors:**
- `409 Conflict` - Budget already exists for this category
- `400 Validation Error` - Invalid data

### Get All Budgets
GET /api/budgets?includeInactive=false

**Response:**
```json
[
  {
    "id": "budget-123",
    "name": "Streaming Budget",
    "category": "Streaming",
    "amount": 1000,
    "currency": "INR",
    "period": "monthly",
    "warning_threshold": 80,
    "status": "active",
    ...
  },
  {
    "id": "budget-456",
    "name": "Total Monthly Budget",
    "category": null,  // Total budget
    "amount": 5000,
    ...
  }
]
```

### Get Budget Summary
GET /api/budgets/summary

Dashboard-ready summary:

```json
{
  "totalBudgets": 3,
  "activeBudgets": 3,
  "budgetsNearLimit": 1,
  "budgetsOverLimit": 0,
  "totalLimit": 5000,  // Sum of monthly budgets
  "totalSpent": 4200,
  "currency": "INR"
}
```

### Get All Budget Statuses
GET /api/budgets/statuses

Real-time status for all budgets:

```json
[
  {
    "budgetId": "budget-123",
    "name": "Streaming Budget",
    "category": "Streaming",
    "limit": 1000,
    "spent": 948,
    "remaining": 52,
    "currency": "INR",
    "period": "monthly",
    "percentage": 94.8,
    "status": "near_limit",
    "alertThreshold": 80,
    "subscriptions": [
      {
        "id": "sub-1",
        "name": "Netflix Premium",
        "amount": 649,
        "billingCycle": "monthly"
      },
      {
        "id": "sub-2",
        "name": "Disney+ Hotstar",
        "amount": 299,
        "billingCycle": "monthly"
      }
    ],
    "projectedSpend": 948  // Same as spent for monthly
  }
]
```

### Get Budget Status
GET /api/budgets/:id/status

Detailed status for a single budget (same format as above).

### Update Budget
PUT /api/budgets/:id

```json
{
  "name": "Updated Name",  // optional
  "limit": 1200,  // optional
  "alert_threshold": 85,  // optional
  ...
}
```

**Note:** Cannot change category after creation.

### Delete Budget
DELETE /api/budgets/:id

Soft deletes (deactivates) the budget.

**Response:**
```json
{
  "message": "Budget deleted successfully"
}
```

### Check Budget Alerts
POST /api/budgets/check-alerts

Manually trigger budget alert check (normally runs automatically daily):

```json
{
  "message": "Budget alerts checked",
  "alertsTriggered": 2,
  "alerts": [
    {
      "budgetId": "budget-123",
      "budgetName": "Streaming Budget",
      "threshold": 80,
      "currentPercentage": 94.8,
      "spent": 948,
      "limit": 1000,
      "currency": "INR"
    }
  ]
}
```

## Automatic Alert System

### Daily Budget Checks

**Schedule:** Every day at 10:00 AM

The system automatically:
1. Fetches all users with active budgets
2. Calculates current spending for each budget
3. Checks if spending exceeds alert threshold
4. Sends email + in-app notification if threshold exceeded
5. Prevents duplicate alerts (max 1 alert per budget per day)

### Alert Thresholds

Default: 80% of budget limit

**Examples:**
- Budget: ₹1000, Threshold: 80% → Alert at ₹800
- Budget: ₹5000, Threshold: 90% → Alert at ₹4500

### Alert Notifications

When budget threshold is exceeded:
- **Email:** Beautiful HTML email (from Week 7 notification system)
- **In-App:** Notification in /api/notifications
- **Content:** Progress bar, spent/remaining/limit, actionable advice

Example notification:
```
Title: 🚨 Budget Alert: Streaming Budget (95%)
Message: You've spent ₹948 of ₹1000 (95%) for Streaming Budget
```

## Budget Period Management

### Current Period Calculation

The system automatically determines the current budget period:

**Monthly Budget (start_date: Jan 15):**
- Period 1: Jan 15 - Feb 15
- Period 2: Feb 15 - Mar 15
- Current date: Feb 18 → **In Period 2**

**Quarterly Budget (start_date: Jan 1):**
- Period 1: Jan 1 - Apr 1
- Period 2: Apr 1 - Jul 1
- Current date: Feb 18 → **In Period 1**

**Yearly Budget:**
- Tracks spending for 12 months from start_date

### Period Reset

Budget spending resets automatically when a new period starts. The system uses `start_date` as the anchor and calculates forward to find the current period.

## Spending Calculation

### Billing Cycle Conversion

All subscriptions are normalized to the budget period:

**Monthly Budget:**
- Daily subscription (₹50/day) → ₹1500/month (50 * 30)
- Weekly subscription (₹100/week) → ₹433/month (100 * 4.33)
- Monthly subscription (₹500/month) → ₹500/month
- Quarterly subscription (₹900/quarter) → ₹300/month (900 / 3)
- Yearly subscription (₹3600/year) → ₹300/month (3600 / 12)
- One-time (₹1000) → ₹0/month (excluded from recurring)

**Quarterly Budget:**
- Monthly subscription (₹500/month) → ₹1500/quarter (500 * 3)

**Yearly Budget:**
- Monthly subscription (₹500/month) → ₹6000/year (500 * 12)

### Category vs Total Budgets

**Category Budget (category: "Streaming"):**
- Only counts subscriptions with category = "Streaming"
- Netflix (₹649) + Disney+ (₹299) = ₹948

**Total Budget (category: null):**
- Counts ALL active subscriptions across all categories
- Streaming (₹948) + Music (₹119) + Fitness (₹500) = ₹1567

## Use Cases

### 1. Control Streaming Costs
```json
POST /api/budgets
{
  "name": "Streaming Limit",
  "category": "Streaming",
  "limit": 1000,
  "currency": "INR",
  "period": "monthly",
  "alert_threshold": 75
}
```

### 2. Overall Monthly Cap
```json
POST /api/budgets
{
  "name": "Total Subscriptions",
  "category": null,
  "limit": 3000,
  "currency": "INR",
  "period": "monthly",
  "alert_threshold": 90
}
```

### 3. Quarterly Entertainment Budget
```json
POST /api/budgets
{
  "name": "Q1 Entertainment",
  "category": "Streaming",
  "limit": 3000,
  "currency": "INR",
  "period": "quarterly"
}
```

### 4. Yearly Software Budget
```json
POST /api/budgets
{
  "name": "Annual Software",
  "category": "Software",
  "limit": 50000,
  "currency": "INR",
  "period": "yearly"
}
```

## Integration with Notifications

Budget alerts use the notification system from Week 7:

**Email Template:**
- Subject: "🚨 Budget Alert: [Budget Name] (XX%)"
- Beautiful HTML with gradient header
- Progress bar visualization
- Spent/Remaining/Limit breakdown
- Warning levels (90%, 95%, 100%+)
- CTA button: "Manage Budget"

**In-App Notification:**
- Stored in `notifications` table
- Unread badge count
- Actionable with "View Budget" link

## Worker Configuration

**Budget Check Worker:**
- Queue: `budget-check`
- Concurrency: 1 (one check at a time)
- Schedule: Daily at 10:00 AM
- Retry: 2 attempts with exponential backoff

**Job Data:**
```typescript
{
  userId?: string  // Check specific user or all users
}
```

**Job Result:**
```typescript
{
  usersChecked: number,
  totalAlerts: number,
  userAlerts: Array<{
    userId: string,
    alertsTriggered: number
  }>
}
```

## Database Schema

```sql
-- From migrations (already created in Week 2)
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,  -- limit_amount
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  period budget_period_type NOT NULL,  -- monthly/quarterly/yearly
  category VARCHAR(50),  -- NULL = total budget
  warning_threshold INTEGER DEFAULT 80,  -- alert_threshold (0-100)
  status budget_status_type DEFAULT 'active',
  current_spending DECIMAL(10, 2) DEFAULT 0,
  alert_enabled BOOLEAN DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budgets_user_status ON budgets(user_id, status);
CREATE INDEX idx_budgets_category ON budgets(category);
```

## Testing

### Create and Check Budget
```bash
# Create budget
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Streaming Budget",
    "category": "Streaming",
    "limit": 1000,
    "currency": "INR",
    "period": "monthly",
    "alert_threshold": 80
  }' \
  http://localhost:3000/api/budgets

# Get budget status
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/budgets/<budget-id>/status

# Check alerts manually
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/budgets/check-alerts
```

### Dashboard Summary
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/budgets/summary
```

## Best Practices

### 1. Budget Hierarchy
Start with a total budget, then add category budgets for problem areas:
```
Total: ₹5000/month (overall cap)
 ├─ Streaming: ₹1000/month (specific control)
 ├─ Music: ₹200/month
 └─ Software: ₹2000/month
```

### 2. Alert Thresholds
- Conservative: 70-80% (early warning)
- Moderate: 80-90% (standard)
- Aggressive: 90-95% (last-minute alerts)

### 3. Period Selection
- **Monthly:** Best for most subscriptions
- **Quarterly:** Good for seasonal budgets
- **Yearly:** Useful for annual software/licenses

### 4. Review and Adjust
- Check budget status weekly
- Adjust limits based on actual spending patterns
- Use projections to anticipate overages

## Comparison: Before vs After

### Before (Week 7)
- ❌ No budget management
- ❌ No spending limits
- ❌ No automatic alerts
- ❌ Manual tracking required

### After (Week 8)
- ✅ Flexible budget system (category + total)
- ✅ Real-time spending tracking
- ✅ Automatic daily alert checks
- ✅ Beautiful email/in-app alerts
- ✅ Spending projections
- ✅ Budget status visualization
- ✅ Period-aware calculations
- ✅ Integration with notification system

## Next Steps (Future Enhancements)

**Phase 3+ Features:**
- Budget recommendations based on historical spending
- Shared budgets for family groups
- Budget rollover (unused budget → next period)
- Spending trends within budgets
- Budget templates (pre-configured budgets)
- Budget forecasting with ML
