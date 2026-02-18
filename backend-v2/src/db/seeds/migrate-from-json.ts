import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../../config/database';

interface OldSubscription {
  id: number | null;
  name: string;
  category: string;
  amount: number | null;
  currency: string;
  billing_cycle: string;
  next_billing_date: string | null;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface OldDatabase {
  subscriptions: OldSubscription[];
  nextId: number;
}

/**
 * Migrate subscription data from JSON file to PostgreSQL
 * This script transfers data from the old backend to the new database
 */
async function migrateFromJSON() {
  console.log('🚀 Starting data migration from JSON to PostgreSQL...\n');

  try {
    // Connect to database
    db.connect();
    await db.testConnection();
    console.log('✅ Database connected\n');

    // Read the old JSON file
    const jsonPath = join(__dirname, '../../../backend/subscriptions.json');
    console.log(`📖 Reading data from: ${jsonPath}`);

    let oldData: OldDatabase;
    try {
      const jsonContent = readFileSync(jsonPath, 'utf-8');
      oldData = JSON.parse(jsonContent);
      console.log(`   Found ${oldData.subscriptions.length} subscriptions\n`);
    } catch (error) {
      console.error('❌ Failed to read JSON file:', error);
      console.log('   Make sure the old backend/subscriptions.json file exists\n');
      return;
    }

    // Check if we need to create a default user first
    console.log('👤 Checking for default user...');
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      ['migrated-user@example.com']
    );

    let userId: string;

    if (userResult.rows.length === 0) {
      console.log('   Creating default user for migrated subscriptions...');
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

      const newUser = await db.query(
        `INSERT INTO users (email, password_hash, name, email_verified, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['migrated-user@example.com', passwordHash, 'Migrated User', false, true]
      );

      userId = newUser.rows[0].id;
      console.log(`   ✅ Created user with ID: ${userId}`);
      console.log('   📧 Email: migrated-user@example.com');
      console.log('   🔑 Password: ChangeMe123! (CHANGE THIS AFTER LOGIN!)\n');
    } else {
      userId = userResult.rows[0].id;
      console.log(`   ✅ Using existing user with ID: ${userId}\n`);
    }

    // Migrate subscriptions
    console.log('📦 Migrating subscriptions...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const oldSub of oldData.subscriptions) {
      try {
        // Check if subscription already exists (by name and category)
        const existing = await db.query(
          'SELECT id FROM subscriptions WHERE user_id = $1 AND name = $2 AND category = $3',
          [userId, oldSub.name, oldSub.category]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⏭️  Skipping "${oldSub.name}" (already exists)`);
          skipCount++;
          continue;
        }

        // Insert subscription
        await db.query(
          `INSERT INTO subscriptions (
            user_id, name, category, amount, currency, billing_cycle,
            next_billing_date, status, description, source,
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            userId,
            oldSub.name,
            oldSub.category,
            oldSub.amount,
            oldSub.currency || 'INR',
            oldSub.billing_cycle || 'monthly',
            oldSub.next_billing_date,
            oldSub.status || 'active',
            oldSub.description || null,
            'manual', // Mark as manual since they're from old system
            oldSub.created_at || new Date().toISOString(),
            oldSub.updated_at || new Date().toISOString(),
          ]
        );

        console.log(`   ✅ Migrated "${oldSub.name}"`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed to migrate "${oldSub.name}":`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total in JSON: ${oldData.subscriptions.length}\n`);

    if (successCount > 0) {
      console.log('✨ Migration completed successfully!');
      console.log('   You can now login with:');
      console.log('   📧 Email: migrated-user@example.com');
      console.log('   🔑 Password: ChangeMe123!');
      console.log('   ⚠️  IMPORTANT: Change this password immediately after first login!\n');
    } else if (skipCount === oldData.subscriptions.length) {
      console.log('✨ All subscriptions already migrated!\n');
    } else {
      console.log('⚠️  Migration completed with some errors. Check the log above.\n');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFromJSON();
}

export { migrateFromJSON };
