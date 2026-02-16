import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DETECTED_FILE = path.join(__dirname, 'detected-subscriptions.json');
const SUBSCRIPTIONS_FILE = path.join(__dirname, 'subscriptions.json');

// Category mapping for better organization
const categoryMap = {
  'groww': 'Investment',
  'zerodha': 'Investment',
  'upstox': 'Investment',
  'motilal': 'Investment',
  'zebpay': 'Investment',
  'furlenco': 'Rentals',
  'rentomojo': 'Rentals',
  'netflix': 'Streaming',
  'prime': 'Streaming',
  'hotstar': 'Streaming',
  'spotify': 'Music',
  'google one': 'Cloud Storage',
  'google workspace': 'Productivity',
  'openai': 'Software',
  'chatgpt': 'Software',
  'leetcode': 'Software',
  'linkedin': 'Productivity',
};

function detectCategory(serviceName) {
  const name = serviceName.toLowerCase();
  for (const [key, category] of Object.entries(categoryMap)) {
    if (name.includes(key)) {
      return category;
    }
  }
  return 'Other';
}

async function importDetectedSubscriptions() {
  try {
    console.log('📥 Starting auto-import of detected subscriptions...\n');

    // Read detected subscriptions
    const detectedData = JSON.parse(await fs.readFile(DETECTED_FILE, 'utf-8'));
    const detected = detectedData.detected || [];

    if (detected.length === 0) {
      console.log('❌ No detected subscriptions to import.');
      return;
    }

    console.log(`Found ${detected.length} detected subscriptions\n`);

    // Read existing subscriptions
    const subscriptionsData = JSON.parse(await fs.readFile(SUBSCRIPTIONS_FILE, 'utf-8'));
    const subscriptions = subscriptionsData.subscriptions || [];

    // Track imports
    let imported = 0;
    let skipped = 0;
    const importedNames = [];

    // Import each detected subscription
    for (const item of detected) {
      // Check if already exists
      const exists = subscriptions.some(
        sub => sub.name.toLowerCase() === item.serviceName.toLowerCase()
      );

      if (exists) {
        console.log(`⏭️  Skipped: ${item.serviceName} (already exists)`);
        skipped++;
        continue;
      }

      // Create subscription object
      const subscription = {
        id: Date.now() + Math.random(),
        name: item.serviceName,
        amount: item.amount || null,
        currency: item.currency || 'INR',
        billing_cycle: item.billingCycle || 'monthly',
        next_billing_date: item.nextBillingDate || null,
        category: detectCategory(item.serviceName) || item.category || 'Other',
        status: 'active',
        description: item.description || `Imported from email scan`,
        created_at: new Date().toISOString(),
      };

      subscriptions.push(subscription);
      imported++;
      importedNames.push(item.serviceName);

      console.log(`✅ Imported: ${item.serviceName} - ₹${item.amount || 'N/A'} - ${subscription.category}`);
    }

    // Save updated subscriptions
    subscriptionsData.subscriptions = subscriptions;
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptionsData, null, 2));

    // Clear detected subscriptions
    detectedData.detected = [];
    await fs.writeFile(DETECTED_FILE, JSON.stringify(detectedData, null, 2));

    console.log('\n' + '='.repeat(50));
    console.log(`\n🎉 Import Complete!\n`);
    console.log(`✅ Imported: ${imported} subscriptions`);
    console.log(`⏭️  Skipped: ${skipped} duplicates`);
    console.log(`📊 Total subscriptions: ${subscriptions.length}\n`);

    if (imported > 0) {
      console.log('📝 Imported services:');
      importedNames.forEach(name => console.log(`   - ${name}`));
    }

    console.log('\n✨ Refresh your dashboard to see the changes!\n');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
  }
}

// Run the import
importDetectedSubscriptions();
