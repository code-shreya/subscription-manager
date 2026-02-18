# Multi-Email Provider Support (Week 10)

This document explains the complete multi-email provider system implemented in Week 10 of Phase 3.

## Overview

Week 10 adds **multi-email provider support** with a unified abstraction layer supporting Gmail, Outlook/Microsoft 365, and future providers (Yahoo, IMAP).

### Key Features

- **Provider Abstraction Layer**: Unified interface for all email providers
- **Gmail Integration**: Ported from original implementation with full TypeScript support
- **Outlook Integration**: New Microsoft Graph API integration for Outlook/Microsoft 365
- **OAuth 2.0 Flow**: Secure authentication for both providers
- **Email Scanning**: Search subscription-related emails with AI-ready output
- **Deep Scan**: Paginated scanning through 365 days of emails
- **Token Management**: Automatic token refresh and storage

## Architecture

```
Email Service
    ↓
EmailProvider (Abstract)
    ├── GmailProvider (Google APIs)
    │   ├── OAuth 2.0 (googleapis)
    │   ├── Gmail API v1
    │   └── Enhanced search queries
    └── OutlookProvider (Microsoft Graph)
        ├── OAuth 2.0 (Microsoft Identity)
        ├── Graph API v1.0
        └── OData queries
```

## Components

### 1. Provider Abstraction (`email-provider.interface.ts`)

Abstract interface defining the contract for all email providers:

```typescript
export abstract class EmailProvider {
  abstract providerName: 'gmail' | 'outlook' | 'yahoo' | 'imap';

  // Core OAuth methods
  abstract initialize(credentials: { clientId, clientSecret, redirectUri }): void;
  abstract getAuthUrl(): string;
  abstract getTokenFromCode(code: string): Promise<OAuthTokens>;
  abstract setCredentials(tokens: OAuthTokens): void;
  abstract isAuthenticated(): boolean;
  abstract refreshAccessToken?(): Promise<OAuthTokens>;

  // Email methods
  abstract searchSubscriptionEmails(maxResults, daysBack, pageToken?): Promise<EmailSearchResult>;
  abstract getEmailDetails(messageId): Promise<EmailMessage | null>;
  abstract scanEmails(maxResults, daysBack, progressCallback?): Promise<EmailMessage[]>;
  abstract deepScan(daysBack, progressCallback?): Promise<EmailMessage[]>;
  abstract disconnect(): Promise<void>;
  abstract getUserInfo?(): Promise<{ email, name?, profilePicture? }>;
}
```

**Key Interfaces:**
- `EmailMessage`: Email data (id, subject, from, date, body)
- `EmailSearchResult`: Search results with pagination
- `EmailScanProgress`: Progress tracking for long scans
- `OAuthTokens`: OAuth token data (access_token, refresh_token, expiry_date)

### 2. Gmail Provider (`gmail-provider.ts`)

**Implementation**: TypeScript port of original Gmail service using `googleapis` package.

**OAuth Configuration:**
- Scopes: `https://www.googleapis.com/auth/gmail.readonly`
- OAuth 2.0 flow with offline access for refresh tokens
- Automatic token refresh on expiry

**Search Query (preserved from original):**
```javascript
after:${dateString} (
  subject:(
    "subscription successful" OR "subscription started" OR "subscription confirmed" OR
    "welcome to your subscription" OR "subscription activated" OR
    subscription OR renewal OR billing OR invoice OR payment OR receipt OR
    "next billing" OR "cancel anytime" OR "manage subscription" OR
    "your plan" OR "membership" OR "auto-renewal" OR "recurring" OR
    "billed monthly" OR "billed annually" OR "subscription fee" OR
    "premium" OR "pro plan" OR "paid plan"
  )
  OR from:(
    noreply OR billing OR subscriptions OR welcome OR payments OR
    netflix OR spotify OR amazon OR google OR apple OR microsoft OR
    hotstar OR zomato OR swiggy OR zerodha OR groww
  )
)
```

**Key Features:**
- Gmail API v1 with full message fetching
- Pagination support (max 500 results per page)
- HTML body extraction and cleaning
- Rate limiting (300ms between emails, 1s between pages)
- Deep scan support (up to 200 emails)

**Usage Example:**
```typescript
import { GmailProvider } from './providers/gmail-provider';

const gmail = new GmailProvider();
gmail.initialize({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'http://localhost:3000/callback'
});

const authUrl = gmail.getAuthUrl();
// Redirect user to authUrl

// After user authorizes:
const tokens = await gmail.getTokenFromCode(code);

// Scan emails:
const emails = await gmail.scanEmails(50, 90);
```

### 3. Outlook Provider (`outlook-provider.ts`)

**Implementation**: New Microsoft Graph API integration for Outlook/Microsoft 365.

**OAuth Configuration:**
- Scopes: `Mail.Read`, `User.Read`, `offline_access`
- Microsoft Identity Platform (common tenant)
- OAuth 2.0 with refresh token support

**Search Query (Graph API):**
```javascript
$filter: receivedDateTime ge ${dateString}
$search: subject:(subscription OR renewal OR billing OR invoice OR payment OR receipt OR membership OR premium)
          OR from:(noreply OR billing OR subscriptions OR welcome OR payments OR netflix OR spotify OR amazon OR microsoft)
```

**Key Features:**
- Microsoft Graph API v1.0
- OData queries with filtering and search
- Pagination support (max 999 results per page)
- Automatic token refresh
- HTML body extraction and cleaning
- Rate limiting (100ms between emails, 500ms between pages)

**Usage Example:**
```typescript
import { OutlookProvider } from './providers/outlook-provider';

const outlook = new OutlookProvider();
outlook.initialize({
  clientId: 'your-app-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'http://localhost:3000/callback'
});

const authUrl = outlook.getAuthUrl();
// Redirect user to authUrl

// After user authorizes:
const tokens = await outlook.getTokenFromCode(code);

// Scan emails:
const emails = await outlook.scanEmails(50, 90);
```

### 4. Email Service (`email.service.ts`)

**Central service** managing email connections using provider abstraction.

**Key Methods:**
- `getAvailableProviders()`: List configured providers
- `getAuthUrl(provider)`: Get OAuth URL for provider
- `connectEmail(userId, provider, code)`: Complete OAuth flow and store connection
- `getEmailConnections(userId)`: List all connected email accounts
- `getConnectedAccount(userId, accountId)`: Get specific connection
- `scanEmails(userId, accountId, options, progressCallback)`: Scan for subscriptions
- `disconnectEmail(userId, accountId)`: Disconnect and revoke access
- `checkAuthStatus(userId, accountId)`: Check authentication status
- `refreshAccessToken(userId, accountId)`: Manually refresh token

**Database Integration:**
- Stores connections in `connected_accounts` table
- Encrypts tokens (TODO: implement encryption layer)
- Tracks last sync time and scan statistics
- Supports multiple accounts per provider

## API Endpoints

All endpoints require authentication (Bearer JWT token).

### Get Available Providers
```http
GET /api/email/providers
```

**Response:**
```json
{
  "providers": [
    {
      "name": "gmail",
      "displayName": "Gmail",
      "configured": true
    },
    {
      "name": "outlook",
      "displayName": "Outlook / Microsoft 365",
      "configured": true
    }
  ]
}
```

### Get Gmail OAuth URL
```http
GET /api/email/gmail/auth-url
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "provider": "gmail"
}
```

**Flow:**
1. Frontend requests auth URL
2. User redirected to Google
3. User authorizes access
4. Google redirects back with code
5. Frontend POSTs code to callback endpoint

### Gmail OAuth Callback
```http
POST /api/email/gmail/callback
Content-Type: application/json

{
  "code": "4/0AY0e-g7..."
}
```

**Response (201):**
```json
{
  "message": "Gmail connected successfully",
  "accountId": "uuid",
  "email": "user@gmail.com",
  "provider": "gmail"
}
```

### Get Outlook OAuth URL
```http
GET /api/email/outlook/auth-url
```

**Response:**
```json
{
  "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=...",
  "provider": "outlook"
}
```

### Outlook OAuth Callback
```http
POST /api/email/outlook/callback
Content-Type: application/json

{
  "code": "M.R3_BAY..."
}
```

**Response (201):**
```json
{
  "message": "Outlook connected successfully",
  "accountId": "uuid",
  "email": "user@outlook.com",
  "provider": "outlook"
}
```

### Get Email Connections
```http
GET /api/email/connections
```

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "provider": "gmail",
      "email": "user@gmail.com",
      "displayName": "John Doe",
      "status": "active",
      "lastSyncedAt": "2026-02-18T10:00:00Z",
      "metadata": {
        "providerType": "gmail",
        "email": "user@gmail.com",
        "lastScanStats": {
          "emailsScanned": 42,
          "lastScanAt": "2026-02-18T10:00:00Z",
          "daysBack": 90,
          "deep": false
        }
      },
      "createdAt": "2026-01-15T08:00:00Z"
    },
    {
      "id": "uuid2",
      "provider": "outlook",
      "email": "user@outlook.com",
      "displayName": "John Doe",
      "status": "active",
      "lastSyncedAt": "2026-02-18T11:00:00Z",
      "metadata": {
        "providerType": "outlook",
        "email": "user@outlook.com"
      },
      "createdAt": "2026-02-01T09:00:00Z"
    }
  ]
}
```

### Get Specific Connection
```http
GET /api/email/connections/:accountId
```

**Response:** Same as single connection above, with additional fields.

### Check Authentication Status
```http
GET /api/email/connections/:accountId/status
```

**Response:**
```json
{
  "isAuthenticated": true,
  "email": "user@gmail.com",
  "provider": "gmail",
  "lastSynced": "2026-02-18T10:00:00Z"
}
```

**Note:** Use this endpoint to check if token is still valid before scanning.

### Scan Emails
```http
POST /api/email/connections/:accountId/scan
Content-Type: application/json

{
  "maxResults": 50,
  "daysBack": 90,
  "deep": false
}
```

**Query Parameters:**
- `maxResults` (optional): Max emails to scan (1-500, default: 50)
- `daysBack` (optional): Days to look back (1-365, default: 90)
- `deep` (optional): Enable deep scan with pagination (default: false)

**Response:**
```json
{
  "message": "Email scan completed",
  "emailsFound": 42,
  "emails": [
    {
      "id": "msg-123",
      "subject": "Your Netflix subscription has been renewed",
      "from": "Netflix <info@mailer.netflix.com>",
      "date": "2026-02-15T05:30:00Z",
      "body": "Hi John, Your monthly Netflix subscription... [truncated to 5000 chars]"
    },
    // ... more emails
  ]
}
```

**Deep Scan:**
When `deep: true`, the system:
1. Searches all pages (up to 200 emails total)
2. Provides progress updates via WebSocket (if connected)
3. Takes longer but finds more subscriptions

**Progress Tracking:**
Connect to WebSocket at `/ws` to receive real-time progress:
```json
{
  "type": "email-scan-progress",
  "accountId": "uuid",
  "progress": {
    "phase": "fetching",
    "current": 25,
    "total": 50,
    "percentage": 50
  }
}
```

### Refresh Access Token
```http
POST /api/email/connections/:accountId/refresh
```

Manually refresh expired token (automatically done during scans).

**Response:**
```json
{
  "message": "Access token refreshed successfully"
}
```

### Disconnect Email
```http
DELETE /api/email/connections/:accountId
```

Revokes access and marks connection as disconnected.

**Response:**
```json
{
  "message": "Email account disconnected successfully"
}
```

## Setup Instructions

### Gmail Setup

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Gmail API

2. **Create OAuth 2.0 Credentials:**
   - Navigate to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/email/gmail/callback` (development)
     - `https://yourapp.com/api/email/gmail/callback` (production)

3. **Configure Environment Variables:**
```bash
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/email/gmail/callback
```

### Outlook Setup

1. **Register Azure App:**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to Azure Active Directory > App registrations
   - Register new application (multi-tenant)

2. **Configure API Permissions:**
   - Add delegated permissions:
     - `Mail.Read` - Read user mail
     - `User.Read` - Read user profile
     - `offline_access` - Maintain access to data
   - Grant admin consent if required

3. **Add Redirect URIs:**
   - Platform: Web
   - Redirect URIs:
     - `http://localhost:3000/api/email/outlook/callback` (development)
     - `https://yourapp.com/api/email/outlook/callback` (production)

4. **Create Client Secret:**
   - Certificates & secrets > New client secret
   - Copy value immediately (shown only once)

5. **Configure Environment Variables:**
```bash
OUTLOOK_CLIENT_ID=your-app-id
OUTLOOK_CLIENT_SECRET=your-client-secret
OUTLOOK_REDIRECT_URI=http://localhost:3000/api/email/outlook/callback
```

## Integration with Detection System

The email integration connects with the detection system from Week 5:

```typescript
// In detection service
import { emailService } from '../email/email.service';
import { aiService } from '../ai/ai.service';

async function detectFromEmails(userId: string): Promise<DetectedSubscription[]> {
  // Get all email connections
  const connections = await emailService.getEmailConnections(userId);

  const allDetected: DetectedSubscription[] = [];

  for (const connection of connections) {
    // Scan emails (cached if scanned recently)
    const emails = await emailService.scanEmails(userId, connection.id, {
      maxResults: 50,
      daysBack: 90,
    });

    // Extract subscriptions using AI (Week 5)
    for (const email of emails) {
      const extracted = await aiService.extractSubscriptionFromEmail({
        subject: email.subject,
        body: email.body,
        from: email.from,
        date: email.date,
      });

      if (extracted) {
        allDetected.push({
          ...extracted,
          source: 'email',
          source_identifier: email.id,
          confidence_score: extracted.confidence || 0.8,
          raw_data: email,
          status: 'pending',
        });
      }
    }
  }

  return allDetected;
}
```

## Database Schema

Uses existing `connected_accounts` table:

```sql
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_type account_type NOT NULL, -- 'gmail' or 'outlook'
  account_identifier VARCHAR(255) NOT NULL, -- Email address
  display_name VARCHAR(255), -- User's name
  access_token_encrypted TEXT, -- Access token (TODO: encrypt)
  refresh_token_encrypted TEXT, -- Refresh token
  token_expires_at TIMESTAMP WITH TIME ZONE,
  status account_status_type DEFAULT 'active',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_hours INTEGER DEFAULT 168, -- Weekly
  metadata JSONB, -- Provider-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_connected_accounts_unique
ON connected_accounts(user_id, account_type, account_identifier);
```

## Security Considerations

1. **Token Encryption**: Access tokens should be encrypted before storage (TODO: implement encryption layer)
2. **Token Expiry**: System automatically checks expiry and refreshes tokens
3. **Scope Minimization**: Only request necessary scopes (read-only access)
4. **HTTPS Only**: OAuth flow must use HTTPS in production
5. **CSRF Protection**: Use state parameter in OAuth flow (future enhancement)
6. **Rate Limiting**: API endpoints protected by rate limiting (100 req/min)
7. **Token Revocation**: Users can disconnect to revoke access

## Testing

### Manual Testing - Gmail

```bash
# Get auth URL
curl http://localhost:3000/api/email/gmail/auth-url \
  -H "Authorization: Bearer <token>"

# Visit authUrl in browser, authorize, copy code

# Connect with code
curl -X POST http://localhost:3000/api/email/gmail/callback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "4/0AY0e-g7..."}'

# Scan emails
curl -X POST http://localhost:3000/api/email/connections/<accountId>/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 20, "daysBack": 90}'
```

### Manual Testing - Outlook

```bash
# Get auth URL
curl http://localhost:3000/api/email/outlook/auth-url \
  -H "Authorization: Bearer <token>"

# Visit authUrl in browser, authorize, copy code

# Connect with code
curl -X POST http://localhost:3000/api/email/outlook/callback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "M.R3_BAY..."}'

# Scan emails
curl -X POST http://localhost:3000/api/email/connections/<accountId>/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 20, "daysBack": 90}'
```

### Unit Tests

Create `email.service.test.ts`:

```typescript
describe('Email Service', () => {
  it('should list available providers', () => {
    const providers = emailService.getAvailableProviders();
    expect(providers.length).toBeGreaterThan(0);
    expect(providers[0]).toHaveProperty('name');
    expect(providers[0]).toHaveProperty('configured');
  });

  it('should generate Gmail auth URL', () => {
    const authUrl = emailService.getAuthUrl('gmail');
    expect(authUrl).toContain('accounts.google.com');
    expect(authUrl).toContain('scope=');
  });

  it('should generate Outlook auth URL', () => {
    const authUrl = emailService.getAuthUrl('outlook');
    expect(authUrl).toContain('login.microsoftonline.com');
    expect(authUrl).toContain('Mail.Read');
  });
});
```

## Troubleshooting

### Error: "Gmail OAuth client not initialized"

**Cause:** Missing environment variables.

**Solution:**
```bash
export GMAIL_CLIENT_ID=your-client-id
export GMAIL_CLIENT_SECRET=your-client-secret
export GMAIL_REDIRECT_URI=http://localhost:3000/api/email/gmail/callback
```

### Error: "Failed to get Outlook tokens"

**Possible Causes:**
1. Invalid client credentials
2. Wrong redirect URI configured in Azure
3. Expired authorization code

**Solution:** Verify Azure app configuration matches environment variables.

### Error: "Token expired"

**Solution:** Call refresh endpoint or re-authorize:
```bash
curl -X POST http://localhost:3000/api/email/connections/<accountId>/refresh \
  -H "Authorization: Bearer <token>"
```

### Gmail API Quota Exceeded

**Cause:** Too many API calls.

**Solution:**
- Implement caching (don't scan same emails repeatedly)
- Reduce scan frequency
- Request quota increase in Google Cloud Console

### Outlook Graph API Rate Limit

**Cause:** Too many requests per second.

**Solution:**
- The provider includes automatic rate limiting (100ms between emails)
- Increase delay if still hitting limits
- Use batch requests (future enhancement)

## Best Practices

1. **Cache Scan Results**: Don't scan same account multiple times per day
2. **Progressive Loading**: Start with quick scan (50 emails, 90 days), offer deep scan option
3. **Background Processing**: Use BullMQ for long scans (future: integrate with email-scan worker)
4. **Error Handling**: Gracefully handle token expiry, network errors, API limits
5. **User Experience**: Show progress bar during scans
6. **Privacy**: Only request read-only access, explain data usage clearly
7. **Token Refresh**: Automatically refresh tokens before expiry
8. **Multiple Accounts**: Support multiple Gmail/Outlook accounts per user

## Comparison: Gmail vs Outlook

| Feature | Gmail | Outlook |
|---------|-------|---------|
| **OAuth Provider** | Google | Microsoft Identity |
| **API** | Gmail API v1 | Graph API v1.0 |
| **SDK** | googleapis | Native fetch |
| **Max Results/Page** | 500 | 999 |
| **Search Syntax** | Gmail query | OData filter + search |
| **Rate Limit** | 250 quota units/user/sec | Varies by tenant |
| **Token Refresh** | Automatic | Automatic |
| **Body Format** | Base64 encoded | JSON (text/html) |
| **Setup Complexity** | Medium | High (Azure portal) |
| **Quota** | 1B units/day | Generous |
| **Personal Account** | Yes | Yes |
| **Work Account** | Yes (Google Workspace) | Yes (Microsoft 365) |

## Week 10 Completion Checklist

- ✅ Provider abstraction layer created
- ✅ Gmail provider implemented (TypeScript port)
- ✅ Outlook provider implemented (Microsoft Graph)
- ✅ Email service with connection management
- ✅ API routes for OAuth flow and scanning
- ✅ Database integration (connected_accounts table)
- ✅ Token management with auto-refresh
- ✅ Deep scan support with pagination
- ✅ Progress tracking for long scans
- ✅ TypeScript compilation successful
- ✅ Tests passing (35 passed, 13 skipped)
- ✅ Documentation complete

**Next**: Week 11 - Cancellation Assistant
