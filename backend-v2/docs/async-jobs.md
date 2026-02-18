# Async Job Processing with BullMQ

This document explains the asynchronous job processing system implemented in Week 6.

## Overview

The application uses **BullMQ** for background job processing, which provides:
- **Reliable job queuing** with Redis persistence
- **Automatic retries** with exponential backoff
- **Progress tracking** for long-running operations
- **Real-time updates** via WebSocket
- **Scheduled/recurring jobs** for daily tasks

## Architecture

```
Client Request → API Endpoint → Queue Job → Return Job ID
                                      ↓
                                  Redis Queue
                                      ↓
                                 Worker Process
                                      ↓
                            Process Job with Progress Updates
                                      ↓
                                WebSocket Broadcast
                                      ↓
                              Client receives updates
```

## Job Queues

### 1. Email Scan Queue (`email-scan`)
Processes email scanning jobs asynchronously.

**Job Data:**
```typescript
{
  userId: string;
  accessToken: string;
  refreshToken: string;
  maxEmails?: number;
  daysBack?: number;
  deepScan?: boolean;
}
```

**Result:**
```typescript
{
  processed: number;
  detected: number;
  detectedIds: string[];
}
```

**Configuration:**
- Concurrency: 2 (max 2 scans at once)
- Rate limit: 5 jobs per minute
- Retries: 3 attempts with exponential backoff

### 2. Renewal Check Queue (`renewal-check`)
Checks for upcoming subscription renewals and sends reminders.

**Job Data:**
```typescript
{
  userId?: string;  // Optional: check specific user or all users
  daysAhead?: number;  // Default: 30 days
}
```

**Result:**
```typescript
{
  totalChecked: number;
  remindersCreated: number;
  subscriptionsDue: Array<{
    userId: string;
    subscriptionId: string;
    name: string;
    daysUntilRenewal: number;
  }>;
}
```

**Scheduled:** Daily at 9:00 AM (via BullMQ repeatable jobs)

### 3. Transaction Sync Queue (`transaction-sync`)
Syncs bank transactions and detects recurring patterns.

**Job Data:**
```typescript
{
  userId: string;
  connectedAccountId: string;
  daysBack?: number;  // Default: 365 days
}
```

**Result:**
```typescript
{
  transactionsSynced: number;
  patternsDetected: number;
  detectedIds: string[];
}
```

## API Endpoints

### Start Email Scan
```http
POST /api/detection/scan/email
Authorization: Bearer <token>

{
  "maxEmails": 200,
  "daysBack": 365,
  "deepScan": false
}

Response (202 Accepted):
{
  "message": "Email scan started",
  "jobId": "email-scan-user123-1234567890",
  "queue": "email-scan",
  "statusUrl": "/api/detection/jobs/email-scan/email-scan-user123-1234567890"
}
```

### Start Bank Scan
```http
POST /api/detection/scan/bank
Authorization: Bearer <token>

{
  "daysBack": 365,
  "connectedAccountId": "account-id-optional"
}

Response (202 Accepted):
{
  "message": "Bank transaction sync started",
  "jobId": "transaction-sync-user123-1234567890",
  "queue": "transaction-sync",
  "statusUrl": "/api/detection/jobs/transaction-sync/transaction-sync-user123-1234567890"
}
```

### Check Job Status
```http
GET /api/detection/jobs/:queue/:jobId
Authorization: Bearer <token>

Response:
{
  "id": "email-scan-user123-1234567890",
  "state": "completed",  // pending | active | completed | failed
  "progress": 100,
  "data": { /* job input data */ },
  "returnvalue": { /* job result */ },
  "attemptsMade": 1,
  "processedOn": 1234567890,
  "finishedOn": 1234567900
}
```

## WebSocket Real-Time Updates

Connect to WebSocket endpoint for real-time job progress:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/jobs/:userId');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'connected':
      console.log('Connected:', message.userId);
      break;

    case 'job-progress':
      console.log(`Job ${message.jobId}: ${message.progress}%`);
      // Update UI progress bar
      break;

    case 'job-completed':
      console.log(`Job ${message.jobId} completed:`, message.result);
      // Show success notification
      break;

    case 'job-failed':
      console.log(`Job ${message.jobId} failed:`, message.error);
      // Show error notification
      break;
  }
};

// Send ping to keep connection alive
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

## Running Workers

### Development
Run workers in watch mode (auto-restart on code changes):
```bash
npm run dev:workers
```

Run API server:
```bash
npm run dev
```

### Production
Build first:
```bash
npm run build
```

Run workers:
```bash
npm run start:workers
```

Run API server:
```bash
npm start
```

**Note:** Workers and API server should run as separate processes in production.

## Scheduled Jobs

The system automatically schedules recurring jobs:

### Daily Renewal Check
- **Schedule:** Every day at 9:00 AM
- **Purpose:** Check for upcoming renewals and send reminders
- **Configuration:** Checks renewals for next 30 days

To manually trigger a renewal check:
```typescript
import { queueRenewalCheck } from './jobs/queue';

await queueRenewalCheck({ daysAhead: 30 });
```

## Job Lifecycle

1. **Queued:** Job added to Redis queue
2. **Waiting:** Job waiting for worker to pick it up
3. **Active:** Worker processing the job
4. **Progress Updates:** Worker calls `job.updateProgress(percent)`
5. **Completed:** Job finished successfully (result stored)
6. **Failed:** Job failed (with reason and retry count)

## Error Handling

- **Automatic Retries:** Jobs retry 3 times with exponential backoff (5s, 25s, 125s)
- **Failed Job Retention:** Failed jobs kept for 7 days for debugging
- **Completed Job Cleanup:** Completed jobs kept for 24 hours, max 100 jobs

## Monitoring

Check queue status programmatically:
```typescript
import { getScheduledJobsStatus } from './jobs/scheduler';

const status = await getScheduledJobsStatus();
console.log(`Total scheduled jobs: ${status.totalScheduled}`);
console.log('Jobs:', status.jobs);
```

## Graceful Shutdown

Workers handle SIGTERM/SIGINT signals for graceful shutdown:
```bash
# Send termination signal
kill -SIGTERM <worker-pid>

# Workers will:
# 1. Stop accepting new jobs
# 2. Finish processing current jobs
# 3. Close Redis connections
# 4. Exit cleanly
```

## Comparison: Before vs After

### Before (Week 5)
- ❌ Synchronous HTTP handlers block requests
- ❌ No progress updates during long scans
- ❌ Client timeout on deep scans (500+ emails)
- ❌ No retry on transient failures
- ❌ Node-cron for scheduled tasks (no persistence)

### After (Week 6)
- ✅ Asynchronous job processing
- ✅ Real-time progress via WebSocket
- ✅ HTTP 202 Accepted response (non-blocking)
- ✅ Automatic retries with exponential backoff
- ✅ BullMQ repeatable jobs (Redis persistence)
- ✅ Scalable worker processes
- ✅ Job result persistence for 24 hours

## Next Steps

Week 7 will expand on this foundation with:
- Advanced analytics job processing
- Email notification sending via job queue
- Bulk export operations
- Report generation workers
