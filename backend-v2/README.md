# SubManager Backend v2

Subscription management API built with Fastify, TypeScript, PostgreSQL, and Redis.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 5
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7 + BullMQ
- **Auth**: JWT (access + refresh tokens) + bcrypt
- **Validation**: Zod
- **Testing**: Vitest
- **Email**: Gmail API (OAuth 2.0)
- **AI**: OpenAI GPT-4 (email parsing)

## Modules

| Module | Description |
|--------|-------------|
| **auth** | Registration, login, JWT token rotation, profile management |
| **subscriptions** | CRUD with multi-currency, billing cycles, tags, reminders |
| **analytics** | Spending totals, category breakdown, upcoming renewals, trends |
| **bank** | Indian bank integration (HDFC, ICICI, SBI, Axis, Kotak), transaction sync |
| **email** | Gmail OAuth, inbox scanning, subscription detection |
| **detection** | Multi-source detection engine (email + bank), import/reject workflow |
| **notifications** | In-app + email notifications, renewal reminders, scan alerts |
| **budgets** | Budget creation, spending tracking, alerts |
| **family** | Family groups, shared subscriptions, invite system |
| **cancellation** | Step-by-step cancellation guides for popular services |
| **recommendations** | Spending optimization suggestions |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- Redis 7

### Setup

```bash
cd backend-v2
npm install
cp .env.example .env   # Edit with your config
```

### Database

```bash
# With Homebrew (macOS)
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

createdb submanager
createuser submanager
psql -d submanager -c "ALTER USER submanager WITH PASSWORD 'submanager_dev_password';"
psql -d submanager -c "GRANT ALL PRIVILEGES ON DATABASE submanager TO submanager;"
psql -d submanager -c "GRANT ALL PRIVILEGES ON SCHEMA public TO submanager;"

# Or with Docker
docker compose up -d

# Run migrations (12 migration files)
npm run migrate
```

### Start

```bash
npm run dev          # API server on http://localhost:3001
npm run dev:workers  # Background job workers (optional)
```

## API Endpoints

### Auth
```
POST   /api/auth/register     Register new user
POST   /api/auth/login        Login
POST   /api/auth/refresh      Refresh access token
POST   /api/auth/logout       Logout (revoke refresh token)
GET    /api/auth/me           Get current user profile
PATCH  /api/auth/me           Update profile
```

### Subscriptions
```
GET    /api/subscriptions          List all
GET    /api/subscriptions/:id      Get by ID
POST   /api/subscriptions          Create
PUT    /api/subscriptions/:id      Update
DELETE /api/subscriptions/:id      Delete
```

### Analytics
```
GET    /api/analytics/overview     Spending totals, category breakdown, upcoming renewals
GET    /api/analytics/trends       Spending trends over time
GET    /api/analytics/expensive    Most expensive subscriptions
```

### Bank Integration
```
GET    /api/banks/supported                  List supported Indian banks
GET    /api/banks/connections                List connected accounts
POST   /api/banks/connect                   Connect a bank account
POST   /api/banks/connections/:id/sync      Sync transactions
GET    /api/banks/connections/:id/recurring  Get recurring transactions
DELETE /api/banks/connections/:id            Disconnect account
```

### Email / Gmail
```
GET    /api/email/connections                List email connections
GET    /api/email/gmail/auth-url             Get Gmail OAuth URL
POST   /api/email/gmail/callback             Handle OAuth callback
POST   /api/email/connections/:id/scan       Scan inbox for subscriptions
```

### Detection
```
GET    /api/detection/results        List detected subscriptions
POST   /api/detection/:id/import     Import a detection as subscription
PATCH  /api/detection/:id/status     Reject/dismiss a detection
POST   /api/detection/scan/email     Start async email detection scan
```

### Notifications
```
GET    /api/notifications            List notifications
PATCH  /api/notifications/:id/read   Mark as read
PATCH  /api/notifications/read-all   Mark all as read
```

### Budgets
```
GET    /api/budgets                  List budgets
POST   /api/budgets                  Create budget
PUT    /api/budgets/:id              Update budget
DELETE /api/budgets/:id              Delete budget
```

All endpoints except auth require `Authorization: Bearer <token>` header.

## Project Structure

```
backend-v2/
├── src/
│   ├── server.ts                    Entry point
│   ├── app.ts                       Fastify app setup (CORS, rate-limit, routes)
│   ├── workers.ts                   BullMQ worker entry point
│   ├── config/
│   │   ├── index.ts                 Environment config
│   │   └── database.ts              PostgreSQL connection pool
│   ├── db/
│   │   ├── migrations/              12 SQL migration files
│   │   ├── seeds/                   Data seeding scripts
│   │   ├── migrate.ts               Migration runner
│   │   └── types.ts                 TypeScript interfaces for all tables
│   ├── modules/
│   │   ├── auth/                    Auth service + routes + tests
│   │   ├── subscriptions/           Subscription CRUD
│   │   ├── analytics/               Analytics + enhanced analytics
│   │   ├── bank/                    Bank service + providers
│   │   ├── email/                   Email service + Gmail/Outlook providers
│   │   ├── detection/               Detection engine (email + bank sources)
│   │   ├── notifications/           Notification service + email templates
│   │   ├── budgets/                 Budget management
│   │   ├── family/                  Family groups + shared subscriptions
│   │   ├── cancellation/            Cancellation guides
│   │   └── recommendations/         Spending recommendations
│   ├── jobs/
│   │   ├── queue.ts                 BullMQ queue setup
│   │   ├── scheduler.ts             Cron job scheduler
│   │   └── workers/                 Background workers
│   └── shared/
│       ├── middleware/               Auth middleware
│       ├── schemas/                  Zod validation schemas
│       └── utils/                    JWT, password utilities
├── docs/                            Feature documentation
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Database

12 migrations creating these tables:

| Table | Purpose |
|-------|---------|
| users | User accounts with bcrypt passwords |
| subscriptions | Subscription data (name, amount, cycle, category, status) |
| detected_subscriptions | AI-detected subscriptions pending review |
| connected_accounts | Bank and email connections |
| bank_transactions | Synced bank transaction data |
| notifications | In-app and email notification queue |
| budgets | User budget definitions and limits |
| subscription_price_history | Price change tracking |
| family_groups | Family plan groups |
| family_group_members | Group membership |
| family_group_invites | Invite system |
| refresh_tokens | JWT refresh tokens with device tracking |
| cancellation_guides | Step-by-step cancellation instructions |

## Scripts

```bash
npm run dev              # Dev server with hot reload
npm run dev:workers      # Background workers with hot reload
npm run build            # Compile TypeScript
npm start                # Production server
npm run migrate          # Run pending migrations
npm run migrate:status   # Check migration status
npm run migrate:reset    # Reset database (destroys data)
npm run migrate:json     # Migrate from old JSON backend
npm test                 # Run tests
npm run test:coverage    # Tests with coverage
npm run lint             # TypeScript type checking
```

## Environment Variables

See `.env.example` for all options. Key variables:

```env
PORT=3001
DATABASE_HOST=localhost
DATABASE_NAME=submanager
DATABASE_USER=submanager
DATABASE_PASSWORD=submanager_dev_password
REDIS_HOST=localhost
JWT_SECRET=your-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your-key        # For email parsing
GMAIL_CLIENT_ID=your-id        # For Gmail OAuth
GMAIL_CLIENT_SECRET=your-secret
```

## Security

- Bcrypt password hashing (12 rounds)
- JWT access tokens (15 min) + refresh tokens (7 days) with rotation
- Rate limiting (100 req/min via Redis)
- CORS protection
- Helmet security headers
- Input validation with Zod
- SQL parameterized queries (injection prevention)
