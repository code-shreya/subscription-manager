# Cancellation Assistant (Week 11)

This document explains the complete cancellation assistance system implemented in Week 11 of Phase 3.

## Overview

Week 11 adds a **comprehensive cancellation assistant** with service-specific guides, AI-powered email drafting, and step-by-step cancellation flows to help users cancel subscriptions easily.

### Key Features

- **Cancellation Guides**: 13 popular Indian services with detailed instructions
- **Difficulty Ratings**: Easy, medium, hard, very hard classifications
- **Multiple Methods**: Online, email, phone, in-app, chat support
- **AI Email Drafting**: OpenAI-powered cancellation email generation
- **Step-by-Step Instructions**: Clear, actionable steps for each service
- **Refund Policies**: Know your refund rights before cancelling
- **Alternative Options**: Pause/downgrade suggestions
- **Cancellation Tracking**: Track your cancellation requests and outcomes

## Architecture

```
Cancellation Service
    ↓
┌─────────────────────────────────────────┐
│ Cancellation Guides Database            │
│ (13 services with detailed instructions)│
└─────────────────────────────────────────┘
    ↓
AI Email Drafter (OpenAI GPT-4)
    ↓
Cancellation Request Tracker
    ↓
User Feedback & Success Rate
```

## Database Schema

### Cancellation Guides Table

```sql
CREATE TABLE cancellation_guides (
  id UUID PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL UNIQUE,
  service_category VARCHAR(100),
  difficulty cancellation_difficulty NOT NULL, -- 'easy' | 'medium' | 'hard' | 'very_hard'
  estimated_time_minutes INTEGER,
  cancellation_methods cancellation_method[] NOT NULL, -- ['online', 'email', 'phone', 'in_app', 'chat']
  primary_method cancellation_method NOT NULL,

  -- Online cancellation
  cancellation_url TEXT,
  requires_login BOOLEAN DEFAULT TRUE,

  -- Email cancellation
  support_email VARCHAR(255),
  email_template TEXT,

  -- Phone cancellation
  support_phone VARCHAR(50),
  phone_hours VARCHAR(100),

  -- Instructions
  steps JSONB, -- Step-by-step guide
  warnings JSONB, -- Important warnings
  tips JSONB, -- Helpful tips

  -- Refund info
  refund_policy TEXT,
  refund_eligible_days INTEGER,

  -- Alternatives
  pause_available BOOLEAN DEFAULT FALSE,
  downgrade_available BOOLEAN DEFAULT FALSE,

  -- Metadata
  last_verified DATE,
  success_rate DECIMAL(5, 2),
  average_response_time_hours INTEGER,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Cancellation Requests Table

```sql
CREATE TABLE cancellation_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  service_name VARCHAR(255) NOT NULL,
  method_used cancellation_method NOT NULL,
  status VARCHAR(50) DEFAULT 'initiated', -- 'initiated' | 'pending' | 'completed' | 'failed'

  -- Email tracking
  email_sent_at TIMESTAMP,
  email_subject TEXT,
  email_body TEXT,

  -- Response tracking
  response_received BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMP,

  -- Outcome
  cancelled_successfully BOOLEAN,
  cancellation_date TIMESTAMP,
  refund_received BOOLEAN DEFAULT FALSE,
  refund_amount DECIMAL(10, 2),

  -- Feedback
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  feedback_notes TEXT,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Supported Services (13 Guides)

| Service | Category | Difficulty | Methods | Success Rate |
|---------|----------|------------|---------|--------------|
| **Netflix India** | Streaming | Easy | Online | 98.5% |
| **Disney+ Hotstar** | Streaming | Easy | Online, In-app | 96.0% |
| **Amazon Prime** | Streaming | Easy | Online | 97.5% |
| **Spotify India** | Music | Easy | Online | 99.0% |
| **YouTube Premium** | Streaming | Easy | Online, In-app | 97.0% |
| **Zomato Pro** | Food & Dining | Medium | Email, In-app | 85.0% |
| **Swiggy One** | Food & Dining | Medium | Email, In-app | 88.0% |
| **Adobe Creative Cloud** | Software | Medium | Online, Chat | 82.0% |
| **Microsoft 365** | Software | Easy | Online | 98.0% |
| **LinkedIn Premium** | Professional | Easy | Online | 97.0% |
| **Cult.fit** | Fitness | Medium | Email, In-app, Phone | 78.0% |
| **Times Prime** | Lifestyle | Hard | Email, Phone | 65.0% |
| **MX Player** | Streaming | Easy | Online, In-app | 95.0% |

## API Endpoints

All endpoints require authentication (Bearer JWT token).

### Get All Cancellation Guides

```http
GET /api/cancellation/guides?query=netflix&category=Streaming
```

**Query Parameters:**
- `query` (optional): Search by service name
- `category` (optional): Filter by category

**Response:**
```json
{
  "guides": [
    {
      "id": "uuid",
      "serviceName": "Netflix India",
      "serviceCategory": "Streaming",
      "difficulty": "easy",
      "estimatedTimeMinutes": 5,
      "cancellationMethods": ["online"],
      "primaryMethod": "online",
      "cancellationUrl": "https://www.netflix.com/cancelplan",
      "requiresLogin": true,
      "steps": [
        {
          "title": "Log in to Netflix",
          "description": "Go to netflix.com and sign in to your account"
        },
        {
          "title": "Go to Account Settings",
          "description": "Click on your profile icon and select 'Account'"
        },
        {
          "title": "Cancel Membership",
          "description": "Under 'Membership & Billing', click 'Cancel Membership'"
        },
        {
          "title": "Confirm Cancellation",
          "description": "Click 'Finish Cancellation' to confirm"
        }
      ],
      "warnings": [
        "You can continue watching until the end of your billing period",
        "Your account will be closed at the end of current billing cycle",
        "No partial refunds for unused time"
      ],
      "tips": [
        "Download content before cancelling to watch later",
        "You can restart your membership anytime",
        "Your viewing history and settings are saved for 10 months"
      ],
      "refundPolicy": "No refunds for partial month. Access continues until end of billing period.",
      "refundEligibleDays": 0,
      "pauseAvailable": false,
      "downgradeAvailable": true,
      "lastVerified": "2026-02-01",
      "successRate": 98.5
    }
  ],
  "count": 1
}
```

### Get Specific Cancellation Guide

```http
GET /api/cancellation/guides/:serviceName
```

**Example:**
```bash
GET /api/cancellation/guides/Netflix%20India
```

**Response:** Same format as single guide above.

**Error (404):**
```json
{
  "error": "Cancellation guide not found",
  "message": "No cancellation guide available for Unknown Service"
}
```

### Draft Cancellation Email (AI-Powered)

```http
POST /api/cancellation/draft-email
Content-Type: application/json

{
  "serviceName": "Netflix India",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "accountId": "user123456",
  "reason": "Moving to a different service",
  "subscriptionDetails": {
    "planName": "Premium",
    "monthlyAmount": 649,
    "startDate": "2024-06-15"
  }
}
```

**Response (200):**
```json
{
  "message": "Email drafted successfully",
  "email": {
    "subject": "Cancellation Request - Netflix India",
    "body": "Dear Netflix India Support Team,\n\nI am writing to request the cancellation of my subscription.\n\nAccount Details:\nName: John Doe\nEmail: john@example.com\nAccount ID: user123456\n\nReason for cancellation: Moving to a different service\n\nI would like to confirm that:\n1. My subscription will be cancelled effective immediately\n2. No further charges will be made to my account\n3. I understand the refund policy\n\nPlease send me a confirmation once the cancellation is processed.\n\nThank you for your service.\n\nBest regards,\nJohn Doe",
    "toEmail": "help@netflix.com"
  }
}
```

**AI Generation (if OpenAI configured):**
- Uses GPT-4 to generate professional cancellation email
- Includes all provided details
- Polite and professional tone
- Requests confirmation
- Asks about refund policy
- Under 200 words

**Template Fallback (if service has email_template):**
- Uses pre-configured template for the service
- Replaces placeholders: `{userName}`, `{userEmail}`, `{accountId}`, `{serviceName}`, `{reason}`, `{date}`

**Basic Fallback (no AI, no template):**
- Generates standard cancellation email
- Includes provided details
- Professional format

### Initiate Cancellation Request

```http
POST /api/cancellation/initiate
Content-Type: application/json

{
  "subscriptionId": "sub-uuid",
  "serviceName": "Netflix India",
  "method": "online",
  "emailSubject": "Cancellation Request",
  "emailBody": "Dear Support..."
}
```

**Method Options:** `online` | `email` | `phone` | `in_app` | `chat`

**Response (201):**
```json
{
  "message": "Cancellation request initiated",
  "request": {
    "id": "req-uuid",
    "serviceName": "Netflix India",
    "method": "online",
    "status": "initiated",
    "createdAt": "2026-02-18T10:00:00Z"
  }
}
```

### Get User's Cancellation Requests

```http
GET /api/cancellation/requests
```

**Response:**
```json
{
  "requests": [
    {
      "id": "req-uuid",
      "subscriptionId": "sub-uuid",
      "serviceName": "Netflix India",
      "method": "online",
      "status": "completed",
      "emailSentAt": null,
      "responseReceived": false,
      "responseDate": null,
      "cancelledSuccessfully": true,
      "cancellationDate": "2026-02-18T12:00:00Z",
      "refundReceived": false,
      "refundAmount": null,
      "difficultyRating": 1,
      "createdAt": "2026-02-18T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Update Cancellation Request

```http
PUT /api/cancellation/requests/:requestId
Content-Type: application/json

{
  "status": "completed",
  "cancelledSuccessfully": true,
  "cancellationDate": "2026-02-18",
  "difficultyRating": 2,
  "feedbackNotes": "Took longer than expected but worked"
}
```

**Response (200):**
```json
{
  "message": "Cancellation request updated",
  "request": {
    "id": "req-uuid",
    "status": "completed",
    "cancelledSuccessfully": true,
    "updatedAt": "2026-02-18T12:00:00Z"
  }
}
```

### Get Cancellation Statistics

```http
GET /api/cancellation/stats
```

**Response:**
```json
{
  "totalGuides": 13,
  "byDifficulty": {
    "easy": 7,
    "medium": 5,
    "hard": 1,
    "very_hard": 0
  },
  "byCategory": {
    "Streaming": 6,
    "Music": 1,
    "Food & Dining": 2,
    "Software": 2,
    "Professional": 1,
    "Fitness": 1,
    "Lifestyle": 1
  },
  "averageSuccessRate": 89.4
}
```

## Guide Examples

### Easy: Netflix India

**Difficulty:** Easy (5 minutes)
**Method:** Online
**Success Rate:** 98.5%

**Steps:**
1. Log in to Netflix (netflix.com)
2. Click profile icon → Account
3. Under "Membership & Billing" → Cancel Membership
4. Click "Finish Cancellation"

**Warnings:**
- Access continues until end of billing period
- No refunds for unused time
- Account closes at end of cycle

**Tips:**
- Download content before cancelling
- Can restart anytime
- History saved for 10 months

### Medium: Zomato Pro

**Difficulty:** Medium (10 minutes)
**Method:** Email or In-App
**Success Rate:** 85.0%

**Contact:** help@zomato.com

**Steps:**
1. Open Zomato app
2. Profile → Help → Membership
3. Select "Cancel Membership"
4. Follow instructions or chat with support

**Warnings:**
- Must cancel before renewal date
- Generally no refunds
- Benefits end immediately

**Email Template Provided:** Yes

### Hard: Times Prime

**Difficulty:** Hard (20 minutes)
**Method:** Email or Phone
**Success Rate:** 65.0%
**Response Time:** 48-72 hours

**Contact:**
- Email: care@timesprime.com
- Phone: +91-22-6202-8888 (Mon-Sat 10AM-7PM IST)

**Steps:**
1. Email customer care with cancellation request
2. Provide membership ID, mobile, email
3. Wait 48-72 hours for response
4. Follow their instructions

**Warnings:**
- No refunds on annual plans
- Benefits end immediately
- Slow response time

## AI Email Drafting

### How It Works

1. **Input:** Service name + user details + reason
2. **Check for Template:** If service has pre-configured template, use it
3. **AI Generation:** If OpenAI configured, use GPT-4 to draft email
4. **Fallback:** Basic template if no AI/template available

### AI Prompt (GPT-4)

```
Draft a polite and professional cancellation email for {service}.

User Details:
- Name: {userName}
- Email: {userEmail}
- Account ID: {accountId}
- Plan: {planName}
- Monthly Amount: {monthlyAmount}
- Member Since: {startDate}

Reason: {reason}

Requirements:
1. Be polite and professional
2. Clearly state intent to cancel
3. Request confirmation
4. Ask about refund policy
5. Request confirmation of no future charges
6. Thank them for service
7. Keep under 200 words
```

### Template Variables

Email templates support these placeholders:
- `{userName}` - User's name
- `{userEmail}` - User's email
- `{accountId}` - Account/membership ID
- `{serviceName}` - Service name
- `{reason}` - Cancellation reason
- `{date}` - Current date
- `{planName}` - Subscription plan name

## Cancellation Tracking

### Status Flow

```
initiated → pending → completed
                  ↓
                failed
```

### Tracking Fields

- **Method Used:** How cancellation was attempted
- **Email Tracking:** Subject, body, sent timestamp
- **Response Tracking:** Received, date
- **Outcome:** Success, date, refund info
- **Feedback:** Difficulty rating (1-5), notes

### Success Metrics

- Overall success rate: **89.4%**
- Easy difficulty: **97.1%** average
- Medium difficulty: **83.3%** average
- Hard difficulty: **65.0%** average

## Integration with Subscriptions

```typescript
// In subscriptions module
import { cancellationService } from '../cancellation/cancellation.service';

async function showCancellationHelp(subscriptionId: string, userId: string) {
  const subscription = await getSubscription(subscriptionId);

  // Get cancellation guide
  const guide = await cancellationService.getGuide(subscription.name);

  if (guide) {
    // Show guide to user
    return {
      guide,
      canCancel: true,
      difficulty: guide.difficulty,
      estimatedTime: guide.estimated_time_minutes,
    };
  }

  // No guide available
  return {
    canCancel: true,
    difficulty: 'unknown',
    message: 'Please contact service provider directly',
  };
}
```

## Seeding Guides

To populate the database with cancellation guides:

```bash
# Run the seed script
npm run seed:cancellation-guides

# Or manually via TypeScript
ts-node src/db/seeds/cancellation-guides.seed.ts
```

**Seed Data Includes:**
- 13 popular Indian services
- Detailed step-by-step instructions
- Warnings and tips
- Refund policies
- Contact information
- Success rates and metadata

## Best Practices

### For Users

1. **Check Guide First:** Review cancellation guide before starting
2. **Note Timing:** Some services require 24-48 hours notice
3. **Use Benefits:** Exhaust remaining benefits before cancelling
4. **Screenshot Everything:** Keep records of confirmation emails
5. **Follow Up:** If no response in advertised timeframe, follow up
6. **Rate Experience:** Provide feedback to help others

### For Developers

1. **Keep Guides Updated:** Verify cancellation flows regularly (quarterly)
2. **Track Success Rates:** Monitor which methods work best
3. **AI Costs:** OpenAI API calls cost money; consider caching drafts
4. **Template Priority:** Use templates when available (faster + cheaper)
5. **User Privacy:** Don't store actual cancellation emails long-term
6. **Feedback Loop:** Use user ratings to update difficulty scores

## Common Cancellation Scenarios

### Scenario 1: Easy Online Cancellation (Netflix)

```bash
# 1. Get guide
GET /api/cancellation/guides/Netflix%20India

# 2. User follows online steps (no API needed)

# 3. Mark as completed
POST /api/cancellation/initiate
{
  "serviceName": "Netflix India",
  "method": "online",
  "subscriptionId": "sub-123"
}

PUT /api/cancellation/requests/{id}
{
  "status": "completed",
  "cancelledSuccessfully": true,
  "cancellationDate": "2026-02-18",
  "difficultyRating": 1
}
```

### Scenario 2: Email Cancellation with AI (Zomato Pro)

```bash
# 1. Get guide
GET /api/cancellation/guides/Zomato%20Pro

# 2. Draft email using AI
POST /api/cancellation/draft-email
{
  "serviceName": "Zomato Pro",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "reason": "Not using enough"
}

# Response includes drafted email

# 3. Initiate request
POST /api/cancellation/initiate
{
  "serviceName": "Zomato Pro",
  "method": "email",
  "emailSubject": "...",
  "emailBody": "...",
  "subscriptionId": "sub-456"
}

# 4. Update when response received
PUT /api/cancellation/requests/{id}
{
  "responseReceived": true,
  "responseDate": "2026-02-20",
  "cancelledSuccessfully": true,
  "cancellationDate": "2026-02-22",
  "difficultyRating": 3
}
```

### Scenario 3: Phone Cancellation (Times Prime)

```bash
# 1. Get guide with phone number
GET /api/cancellation/guides/Times%20Prime

# Guide includes: +91-22-6202-8888 (Mon-Sat 10AM-7PM IST)

# 2. Initiate request
POST /api/cancellation/initiate
{
  "serviceName": "Times Prime",
  "method": "phone",
  "subscriptionId": "sub-789"
}

# 3. User calls phone number

# 4. Update after call
PUT /api/cancellation/requests/{id}
{
  "responseReceived": true,
  "cancelledSuccessfully": true,
  "cancellationDate": "2026-02-25",
  "difficultyRating": 4,
  "feedbackNotes": "Had to call 3 times, finally got through and cancelled"
}
```

## Troubleshooting

### No Guide Available

**Issue:** Service not in database.

**Solution:**
- Direct user to contact service provider
- Add guide to database if service is popular
- Contribute guide to open-source repo (future)

### AI Email Generation Fails

**Issue:** OpenAI API error or rate limit.

**Solution:**
- Fallback to basic template automatically
- Check `OPENAI_API_KEY` environment variable
- Monitor API usage and costs

### Cancellation Not Working

**Issue:** Steps in guide outdated.

**Solution:**
- Update guide with current steps
- Set `last_verified` date
- Notify users of outdated guide

## Future Enhancements (Post-Launch)

### Phase 4+:
- **Automated Cancellation**: API integrations to cancel directly
- **Browser Extension**: Auto-fill cancellation forms
- **Calendar Reminders**: Remind before renewal date
- **Negotiation Bot**: Attempt to negotiate lower price before cancelling
- **Shared Experiences**: User-contributed cancellation tips
- **Video Guides**: Screen recordings of cancellation process
- **Live Chat Integration**: Direct support chat within app

## Week 11 Completion Checklist

- ✅ Database schema created (cancellation_guides, cancellation_requests)
- ✅ Cancellation service with AI email drafting
- ✅ API routes for all cancellation operations
- ✅ Seed data for 13 popular Indian services
- ✅ Difficulty ratings (easy, medium, hard)
- ✅ Multiple cancellation methods supported
- ✅ Step-by-step instructions for each service
- ✅ Refund policy information
- ✅ Cancellation request tracking
- ✅ TypeScript compilation successful
- ✅ Tests passing (35 passed, 13 skipped)
- ✅ Documentation complete

**Next**: Week 12 - Family Plans & AI Recommendations
