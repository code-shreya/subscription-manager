# Database Documentation

## Overview

The subscription manager uses PostgreSQL 16 as the primary database with a comprehensive schema designed for scalability and feature-richness.

## Schema Design

### Core Tables

#### 1. **users**
User accounts and authentication data.
- UUID primary key
- Email-based authentication
- Password hashing with bcrypt
- Email verification support
- Activity tracking (last login)

#### 2. **subscriptions**
Active user subscriptions.
- Linked to users via foreign key
- Flexible billing cycles (daily to yearly)
- Status tracking (active, cancelled, expired, paused)
- Multiple sources (manual, email, bank, sms)
- Tag support for organization
- Price and currency tracking

#### 3. **detected_subscriptions**
Subscription detection results from email/bank scans.
- Confidence scoring (0.00 to 1.00)
- Multiple detection sources
- Status tracking (pending, confirmed, rejected, imported)
- Stores raw data in JSONB for reference
- Links to imported subscriptions

#### 4. **connected_accounts**
Connected email and bank accounts.
- Multiple account types (Gmail, Outlook, bank, UPI)
- Encrypted token storage
- Sync frequency configuration
- Status monitoring
- Provider-specific metadata

#### 5. **bank_transactions**
Bank transaction history.
- Linked to connected accounts
- Recurring transaction detection
- Merchant identification
- Category classification
- Subscription linking

### Feature Tables

#### 6. **notifications**
Notification queue and history.
- Multiple types (renewal reminders, price changes, budget alerts)
- Multi-channel delivery (email, push, in-app)
- Status tracking with timestamps
- Scheduled notification support
- Error handling and retry logic

#### 7. **budgets**
Budget management and tracking.
- Period-based (weekly, monthly, quarterly, yearly)
- Category-specific or total budgets
- Warning thresholds (default 80%)
- Current spending tracking
- Alert configuration

#### 8. **subscription_price_history**
Price change tracking over time.
- Historical price data
- Change type and percentage
- Notification tracking
- Trend analysis support

### Advanced Features

#### 9. **family_groups**
Family plan sharing system.
- Owner-based groups
- Member management
- Invite system with tokens
- Shared subscriptions with split calculations

Supporting tables:
- `family_group_members` - Group membership
- `family_group_invites` - Pending invites
- `shared_subscriptions` - Shared subscription details

#### 10. **refresh_tokens**
JWT refresh token management.
- Token rotation support
- Revocation capability
- Device and IP tracking
- Automatic cleanup function

## Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Reset database (WARNING: destroys all data)
npm run migrate:reset
```

### Migration Files

Migrations are executed in alphanumeric order:

```
000_create_migrations_table.sql   - Migration tracking
001_create_users.sql               - User accounts
002_create_subscriptions.sql       - Subscriptions
003_create_detected_subscriptions.sql - Detection results
004_create_connected_accounts.sql  - Account connections
005_create_bank_transactions.sql   - Transaction history
006_create_notifications.sql       - Notifications
007_create_budgets.sql             - Budget management
008_create_subscription_price_history.sql - Price tracking
009_create_family_groups.sql       - Family sharing
010_create_refresh_tokens.sql      - Authentication tokens
```

### Creating New Migrations

1. Create a new `.sql` file in `src/db/migrations/`
2. Name it with a sequential number: `011_your_migration_name.sql`
3. Write your SQL schema changes
4. Run `npm run migrate` to apply

## Database Connection

### Configuration

Database connection is configured via environment variables:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=submanager
DATABASE_USER=submanager
DATABASE_PASSWORD=your-password
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### Connection Pool

The application uses `pg` connection pooling:
- Min connections: 2
- Max connections: 10
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds

### Usage in Code

```typescript
import { db } from './config/database';

// Simple query
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction
import { withTransaction } from './config/database';

await withTransaction(async (client) => {
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO subscriptions ...');
  // Automatically commits or rolls back on error
});
```

## Indexes

All tables include strategic indexes for performance:

- **Primary keys**: UUID with gen_random_uuid()
- **Foreign keys**: Indexed for JOIN performance
- **Query patterns**: Common filters (status, dates, user_id)
- **Full-text**: GIN indexes for JSONB and array fields

## Data Types

### Custom ENUM Types

- `billing_cycle_type`: Subscription billing frequencies
- `subscription_status_type`: Subscription states
- `subscription_source_type`: Where subscription was added
- `detection_status_type`: Detection result states
- `account_type`: Connected account types
- `notification_type`: Notification categories
- `budget_period`: Budget time periods
- And more...

### Special Fields

- **JSONB**: For flexible, queryable JSON data (metadata, raw_data)
- **TEXT[]**: Array fields for tags and collections
- **INET**: IP address storage
- **TIMESTAMP WITH TIME ZONE**: All timestamps include timezone

## Triggers

### Auto-updating Timestamps

Tables with `updated_at` columns have triggers to automatically update the timestamp on row modification:

```sql
CREATE TRIGGER table_name_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

Applies to: users, subscriptions, connected_accounts, budgets, family_groups

## Functions

### cleanup_expired_refresh_tokens()

Removes expired and old revoked refresh tokens:
- Deletes tokens where `expires_at < CURRENT_TIMESTAMP`
- Deletes revoked tokens older than 30 days

Can be called manually or via scheduled job:

```sql
SELECT cleanup_expired_refresh_tokens();
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Use transactions** for multi-step operations
3. **Check foreign key constraints** before deletion
4. **Use JSONB** for flexible schema fields
5. **Index frequently queried columns**
6. **Use ENUM types** for fixed value sets
7. **Store timestamps with timezone** for global apps

## Backup and Restore

### Backup

```bash
pg_dump -U submanager -h localhost submanager > backup.sql
```

### Restore

```bash
psql -U submanager -h localhost submanager < backup.sql
```

## Performance Monitoring

### Query Performance

```sql
-- Show slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Show table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Connection Pool Monitoring

```sql
-- Show active connections
SELECT * FROM pg_stat_activity WHERE datname = 'submanager';
```

## Troubleshooting

### Connection Issues

1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Check network/firewall settings
4. Review logs: `tail -f /var/log/postgresql/postgresql.log`

### Migration Failures

1. Check migration error message
2. Verify previous migrations completed: `npm run migrate:status`
3. Check database permissions
4. Review SQL syntax in migration file

### Performance Issues

1. Check query execution plans: `EXPLAIN ANALYZE`
2. Verify indexes exist on filtered columns
3. Monitor connection pool usage
4. Consider increasing pool size for high traffic

## Future Enhancements

- [ ] Read replicas for scaling reads
- [ ] Partitioning for large tables (transactions, notifications)
- [ ] Full-text search with pg_trgm
- [ ] Materialized views for analytics
- [ ] Automated backup scheduling
