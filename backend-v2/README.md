# Subscription Manager Backend v2

Next-generation subscription management system built with TypeScript, Fastify, PostgreSQL, and Redis.

## 🎉 Phase 1 Complete!

All 4 weeks of Phase 1 have been successfully implemented:

- ✅ **Week 1**: Project Scaffolding
- ✅ **Week 2**: Database Schema
- ✅ **Week 3**: Authentication System
- ✅ **Week 4**: Core API & Data Migration

## Features

### Authentication
- ✅ User registration and login
- ✅ JWT access tokens (15 min) + refresh tokens (7 days)
- ✅ Token rotation on refresh
- ✅ Password strength validation
- ✅ Protected routes with middleware
- ✅ Device tracking (IP, User-Agent)

### Subscription Management
- ✅ Full CRUD operations
- ✅ Multi-currency support
- ✅ Flexible billing cycles (daily, weekly, monthly, quarterly, yearly, one-time)
- ✅ Status tracking (active, cancelled, expired, paused)
- ✅ Tags and notes support
- ✅ Reminder configuration

### Analytics
- ✅ Monthly and yearly spending totals
- ✅ Category breakdown
- ✅ Upcoming renewals (next 30 days)
- ✅ Most expensive subscriptions
- ✅ Subscription counts by status

### Infrastructure
- ✅ PostgreSQL 16 database with 14 tables
- ✅ Redis for caching and rate limiting
- ✅ SQL migrations with version tracking
- ✅ Data migration from JSON
- ✅ Swagger/OpenAPI documentation
- ✅ Comprehensive error handling
- ✅ Request validation with Zod

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 5
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Validation**: Zod
- **Testing**: Vitest
- **Authentication**: JWT + bcrypt
- **Documentation**: Swagger/OpenAPI

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL & Redis)

### 2. Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and set your configuration
nano .env
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Run database migrations
npm run migrate
```

### 4. Migrate Existing Data (Optional)

If you have data from the old backend:

```bash
# Migrate subscriptions from backend/subscriptions.json
npm run migrate:json
```

This will:
- Create a default user (email: `migrated-user@example.com`, password: `ChangeMe123!`)
- Transfer all subscriptions to PostgreSQL
- Skip duplicates automatically

**⚠️ IMPORTANT**: Change the default password immediately after first login!

### 5. Start Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:3001`

## API Documentation

### Interactive API Explorer

Visit `http://localhost:3001/docs` for the Swagger UI with interactive API testing.

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user (protected)
- `PATCH /api/auth/me` - Update profile (protected)

#### Subscriptions
- `GET /api/subscriptions` - List all subscriptions (protected)
- `GET /api/subscriptions/:id` - Get subscription by ID (protected)
- `POST /api/subscriptions` - Create subscription (protected)
- `PUT /api/subscriptions/:id` - Update subscription (protected)
- `DELETE /api/subscriptions/:id` - Delete subscription (protected)

#### Analytics
- `GET /api/analytics` - Get analytics overview (protected)
- `GET /api/analytics/trends` - Get spending trends (protected)
- `GET /api/analytics/expensive` - Get most expensive subscriptions (protected)

## Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build           # Compile TypeScript
npm start               # Run production build

# Database
npm run migrate         # Run pending migrations
npm run migrate:status  # Check migration status
npm run migrate:reset   # Reset database (⚠️ destroys data)
npm run migrate:json    # Migrate data from old JSON file

# Testing
npm test                # Run all tests
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage

# Linting
npm run lint            # Check TypeScript types
```

## Project Structure

```
backend-v2/
├── src/
│   ├── app.ts                    # Fastify app factory
│   ├── server.ts                 # Server entry point
│   ├── config/
│   │   ├── index.ts             # Environment configuration
│   │   └── database.ts          # Database connection pool
│   ├── db/
│   │   ├── migrations/          # SQL migration files (11 files)
│   │   ├── seeds/               # Data seeding scripts
│   │   │   └── migrate-from-json.ts
│   │   ├── migrate.ts           # Migration runner
│   │   ├── types.ts             # Database type definitions
│   │   └── README.md            # Database documentation
│   ├── modules/
│   │   ├── auth/                # Authentication module
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.test.ts
│   │   │   └── README.md
│   │   ├── subscriptions/       # Subscription module
│   │   │   ├── subscriptions.service.ts
│   │   │   └── subscriptions.routes.ts
│   │   └── analytics/           # Analytics module
│   │       ├── analytics.service.ts
│   │       └── analytics.routes.ts
│   └── shared/
│       ├── middleware/          # Shared middleware
│       │   └── authenticate.ts
│       ├── schemas/             # Zod validation schemas
│       │   ├── auth.schema.ts
│       │   └── subscription.schema.ts
│       └── utils/               # Shared utilities
│           ├── jwt.ts
│           └── password.ts
├── docker-compose.yml           # Development environment
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Environment Variables

Key configuration options:

```env
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=submanager
DATABASE_USER=submanager
DATABASE_PASSWORD=your-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

See `.env.example` for all available options.

## Testing

### Run Tests

```bash
npm test
```

### Test Coverage

- ✅ 35 tests passing
- ⏭️ 13 tests skipped (require PostgreSQL)
- 📊 Coverage: Authentication, JWT, Password utils

### Database Tests

To run all tests including database tests:

1. Start PostgreSQL: `docker compose up -d`
2. Run migrations: `npm run migrate`
3. Run tests: `npm test`

## Database Schema

The system uses 14 PostgreSQL tables:

### Core Tables
- `users` - User accounts
- `subscriptions` - Active subscriptions
- `detected_subscriptions` - AI detection results
- `connected_accounts` - Email/bank integrations
- `bank_transactions` - Financial data
- `notifications` - Notification queue
- `budgets` - Budget management
- `subscription_price_history` - Price tracking
- `refresh_tokens` - JWT refresh tokens

### Advanced Tables
- `family_groups` - Family plan management
- `family_group_members` - Group membership
- `family_group_invites` - Invite system
- `shared_subscriptions` - Shared subscription tracking

See `src/db/README.md` for detailed schema documentation.

## Migration from Old Backend

The new backend runs on port 3001 (vs 3000 for old backend). Both can run simultaneously:

**Old Backend**: `http://localhost:3000`
**New Backend**: `http://localhost:3001`

### Migration Steps

1. **Start New Backend**:
   ```bash
   cd backend-v2
   docker compose up -d
   npm run migrate
   npm run dev
   ```

2. **Migrate Data**:
   ```bash
   npm run migrate:json
   ```

3. **Update Frontend**:
   - Change API base URL from `:3000` to `:3001`
   - Add JWT token to requests
   - Update API client to use new endpoints

4. **Test**: Verify all functionality works with new backend

5. **Switch**: Update production to use new backend

## API Examples

### Register & Login

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# Response: { user: {...}, tokens: { accessToken, refreshToken } }

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Manage Subscriptions

```bash
# List subscriptions (protected)
curl -X GET http://localhost:3001/api/subscriptions \
  -H "Authorization: Bearer <access_token>"

# Create subscription
curl -X POST http://localhost:3001/api/subscriptions \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Netflix",
    "category": "Streaming",
    "amount": 199,
    "currency": "INR",
    "billing_cycle": "monthly",
    "description": "Netflix Premium Plan"
  }'

# Get analytics
curl -X GET http://localhost:3001/api/analytics \
  -H "Authorization: Bearer <access_token>"
```

## Security

- ✅ Bcrypt password hashing (12 rounds)
- ✅ JWT with short-lived access tokens
- ✅ Token rotation on refresh
- ✅ Rate limiting (100 req/min)
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation with Zod
- ✅ SQL injection protection
- ✅ XSS protection

## Performance

- ✅ Database connection pooling
- ✅ Redis caching (ready for implementation)
- ✅ Efficient SQL queries with indexes
- ✅ Async/await throughout
- ✅ TypeScript for type safety

## Next Steps (Phase 2)

Phase 2 will add:
- Multi-layer detection engine (email + bank + SMS)
- BullMQ for async job processing
- Advanced analytics and notifications
- Budget management with alerts

See the main plan document for full roadmap.

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps

# View PostgreSQL logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres
```

### Migration Issues

```bash
# Check migration status
npm run migrate:status

# Reset and re-run migrations
npm run migrate:reset
npm run migrate
```

### Build Issues

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

## Support

For issues or questions:
- Check the documentation in `src/modules/*/README.md`
- Review the migration plan in the main project
- Check database documentation in `src/db/README.md`

## License

ISC
