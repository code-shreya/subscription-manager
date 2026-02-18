import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { db } from '../config/database';

interface Migration {
  name: string;
  path: string;
  sql: string;
}

/**
 * Load all migration files from the migrations directory
 */
function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort to ensure migrations run in order

  return files.map(file => ({
    name: basename(file, '.sql'),
    path: join(migrationsDir, file),
    sql: readFileSync(join(migrationsDir, file), 'utf-8'),
  }));
}

/**
 * Get list of executed migrations from the database
 */
async function getExecutedMigrations(): Promise<Set<string>> {
  try {
    const result = await db.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY executed_at'
    );
    return new Set(result.rows.map(row => row.name));
  } catch (error) {
    // If migrations table doesn't exist yet, return empty set
    return new Set();
  }
}

/**
 * Record a migration as executed
 */
async function recordMigration(name: string): Promise<void> {
  await db.query(
    'INSERT INTO migrations (name, executed_at) VALUES ($1, CURRENT_TIMESTAMP)',
    [name]
  );
}

/**
 * Execute a single migration
 */
async function executeMigration(migration: Migration): Promise<void> {
  console.log(`\n📦 Running migration: ${migration.name}`);

  try {
    // Execute the migration SQL
    await db.query(migration.sql);

    // Record the migration
    await recordMigration(migration.name);

    console.log(`✅ Migration completed: ${migration.name}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migration.name}`);
    console.error(error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Connect to database
    db.connect();

    // Test connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Load all migrations
    const migrations = loadMigrations();
    console.log(`📋 Found ${migrations.length} migration files\n`);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`✓ ${executedMigrations.size} migrations already executed\n`);

    // Filter pending migrations
    const pendingMigrations = migrations.filter(
      migration => !executedMigrations.has(migration.name)
    );

    if (pendingMigrations.length === 0) {
      console.log('✨ All migrations are up to date!\n');
      return;
    }

    console.log(`⏳ ${pendingMigrations.length} migrations to execute:\n`);
    pendingMigrations.forEach(m => console.log(`   - ${m.name}`));

    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log('\n✨ All migrations completed successfully!\n');
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

/**
 * Check migration status without running them
 */
async function checkMigrationStatus(): Promise<void> {
  console.log('📊 Checking migration status...\n');

  try {
    db.connect();
    await db.testConnection();

    const migrations = loadMigrations();
    const executedMigrations = await getExecutedMigrations();

    console.log('Migration Status:');
    console.log('─────────────────────────────────────────────────────\n');

    migrations.forEach(migration => {
      const status = executedMigrations.has(migration.name) ? '✅' : '⏳';
      console.log(`${status} ${migration.name}`);
    });

    console.log('\n─────────────────────────────────────────────────────');
    console.log(`Total: ${migrations.length} migrations`);
    console.log(`Executed: ${executedMigrations.size}`);
    console.log(`Pending: ${migrations.length - executedMigrations.size}\n`);
  } catch (error) {
    console.error('Failed to check migration status:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

/**
 * Reset database (WARNING: This will drop all data!)
 */
async function resetDatabase(): Promise<void> {
  console.log('⚠️  WARNING: This will drop all tables and data!');

  try {
    db.connect();
    await db.testConnection();

    console.log('Dropping all tables...');

    // Drop tables in reverse order to respect foreign key constraints
    const dropQueries = [
      'DROP TABLE IF EXISTS shared_subscriptions CASCADE',
      'DROP TABLE IF EXISTS family_group_invites CASCADE',
      'DROP TABLE IF EXISTS family_group_members CASCADE',
      'DROP TABLE IF EXISTS family_groups CASCADE',
      'DROP TABLE IF EXISTS subscription_price_history CASCADE',
      'DROP TABLE IF EXISTS budgets CASCADE',
      'DROP TABLE IF EXISTS notifications CASCADE',
      'DROP TABLE IF EXISTS bank_transactions CASCADE',
      'DROP TABLE IF EXISTS connected_accounts CASCADE',
      'DROP TABLE IF EXISTS detected_subscriptions CASCADE',
      'DROP TABLE IF EXISTS refresh_tokens CASCADE',
      'DROP TABLE IF EXISTS subscriptions CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS migrations CASCADE',

      // Drop custom types
      'DROP TYPE IF EXISTS invite_status CASCADE',
      'DROP TYPE IF EXISTS member_role CASCADE',
      'DROP TYPE IF EXISTS price_change_type CASCADE',
      'DROP TYPE IF EXISTS budget_status CASCADE',
      'DROP TYPE IF EXISTS budget_period CASCADE',
      'DROP TYPE IF EXISTS notification_status CASCADE',
      'DROP TYPE IF EXISTS notification_channel CASCADE',
      'DROP TYPE IF EXISTS notification_type CASCADE',
      'DROP TYPE IF EXISTS transaction_type CASCADE',
      'DROP TYPE IF EXISTS account_status_type CASCADE',
      'DROP TYPE IF EXISTS account_type CASCADE',
      'DROP TYPE IF EXISTS detection_source_type CASCADE',
      'DROP TYPE IF EXISTS detection_status_type CASCADE',
      'DROP TYPE IF EXISTS subscription_source_type CASCADE',
      'DROP TYPE IF EXISTS subscription_status_type CASCADE',
      'DROP TYPE IF EXISTS billing_cycle_type CASCADE',

      // Drop functions
      'DROP FUNCTION IF EXISTS update_updated_at_column CASCADE',
      'DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens CASCADE',
    ];

    for (const query of dropQueries) {
      await db.query(query);
    }

    console.log('✅ All tables dropped\n');
    console.log('Run migrations to recreate tables: npm run migrate\n');
  } catch (error) {
    console.error('Failed to reset database:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// CLI commands
const command = process.argv[2];

switch (command) {
  case 'up':
    runMigrations();
    break;
  case 'status':
    checkMigrationStatus();
    break;
  case 'reset':
    resetDatabase();
    break;
  default:
    console.log('Database Migration Tool\n');
    console.log('Usage:');
    console.log('  npm run migrate up      - Run all pending migrations');
    console.log('  npm run migrate status  - Check migration status');
    console.log('  npm run migrate reset   - Reset database (drops all tables)\n');
    process.exit(0);
}
