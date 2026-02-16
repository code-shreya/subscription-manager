import dotenv from 'dotenv';

// Load environment variables FIRST before anything else
dotenv.config();

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load services dynamically after dotenv to ensure env vars are available
let gmailService, aiService, schedulerService, notificationService, plaidService;
const initServices = async () => {
  const gmailModule = await import('./services/gmailService.js');
  const aiModule = await import('./services/aiService.js');
  const schedulerModule = await import('./services/schedulerService.js');
  const notificationModule = await import('./services/notificationService.js');
  const plaidModule = await import('./plaid-service.js');
  gmailService = gmailModule.default;
  aiService = aiModule.default;
  schedulerService = schedulerModule.default;
  notificationService = notificationModule.default;
  plaidService = plaidModule.default;
  gmailService.initializeOAuth();
  await schedulerService.initialize();
  await notificationService.initialize();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = join(__dirname, 'subscriptions.json');
const DETECTED_FILE = join(__dirname, 'detected-subscriptions.json');
const CONNECTED_ACCOUNTS_FILE = join(__dirname, 'connected-accounts.json');
const TRANSACTIONS_FILE = join(__dirname, 'transactions.json');
const DETECTED_BANK_FILE = join(__dirname, 'detected-from-bank.json');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database files
const initDB = async () => {
  if (!existsSync(DB_FILE)) {
    await fs.writeFile(DB_FILE, JSON.stringify({ subscriptions: [], nextId: 1 }, null, 2));
  }
  if (!existsSync(DETECTED_FILE)) {
    await fs.writeFile(DETECTED_FILE, JSON.stringify({ detected: [], lastScan: null }, null, 2));
  }
};

// Helper functions
const readDB = async () => {
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeDB = async (data) => {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
};

const readDetected = async () => {
  const data = await fs.readFile(DETECTED_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeDetected = async (data) => {
  await fs.writeFile(DETECTED_FILE, JSON.stringify(data, null, 2));
};

const readConnectedAccounts = async () => {
  const data = await fs.readFile(CONNECTED_ACCOUNTS_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeConnectedAccounts = async (data) => {
  await fs.writeFile(CONNECTED_ACCOUNTS_FILE, JSON.stringify(data, null, 2));
};

const readTransactions = async () => {
  const data = await fs.readFile(TRANSACTIONS_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeTransactions = async (data) => {
  await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
};

const readDetectedBank = async () => {
  const data = await fs.readFile(DETECTED_BANK_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeDetectedBank = async (data) => {
  await fs.writeFile(DETECTED_BANK_FILE, JSON.stringify(data, null, 2));
};

// API Routes

// Get all subscriptions
app.get('/api/subscriptions', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.subscriptions.sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single subscription
app.get('/api/subscriptions/:id', async (req, res) => {
  try {
    const db = await readDB();
    const subscription = db.subscriptions.find(s => s.id === parseInt(req.params.id));
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new subscription
app.post('/api/subscriptions', async (req, res) => {
  try {
    const { name, category, amount, currency, billing_cycle, next_billing_date, description } = req.body;
    const db = await readDB();

    const newSubscription = {
      id: db.nextId++,
      name,
      category,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      billing_cycle,
      next_billing_date,
      status: 'active',
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.subscriptions.push(newSubscription);
    await writeDB(db);

    res.status(201).json(newSubscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subscription
app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const { name, category, amount, currency, billing_cycle, next_billing_date, status, description } = req.body;
    const db = await readDB();

    const index = db.subscriptions.findIndex(s => s.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    db.subscriptions[index] = {
      ...db.subscriptions[index],
      name,
      category,
      amount: parseFloat(amount),
      currency,
      billing_cycle,
      next_billing_date,
      status,
      description,
      updated_at: new Date().toISOString()
    };

    await writeDB(db);
    res.json(db.subscriptions[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete subscription
app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const db = await readDB();
    const index = db.subscriptions.findIndex(s => s.id === parseInt(req.params.id));

    if (index === -1) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    db.subscriptions.splice(index, 1);
    await writeDB(db);

    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const db = await readDB();
    const activeSubscriptions = db.subscriptions.filter(s => s.status === 'active');

    // Monthly spending
    let monthlyTotal = 0;
    let subscriptionsWithAmount = 0;
    let subscriptionsWithoutAmount = 0;

    activeSubscriptions.forEach(sub => {
      if (sub.amount && !isNaN(sub.amount)) {
        subscriptionsWithAmount++;
        if (sub.billing_cycle === 'monthly') {
          monthlyTotal += parseFloat(sub.amount);
        } else if (sub.billing_cycle === 'yearly') {
          monthlyTotal += parseFloat(sub.amount) / 12;
        }
      } else {
        subscriptionsWithoutAmount++;
      }
    });

    const yearlyTotal = monthlyTotal * 12;

    // Category breakdown
    const categoryMap = {};
    activeSubscriptions.forEach(sub => {
      if (!categoryMap[sub.category]) {
        categoryMap[sub.category] = { category: sub.category, count: 0, monthly_amount: 0 };
      }
      categoryMap[sub.category].count++;

      // Only add amount if it's not null
      if (sub.amount && !isNaN(sub.amount)) {
        const monthlyAmount = sub.billing_cycle === 'monthly' ? parseFloat(sub.amount) : parseFloat(sub.amount) / 12;
        categoryMap[sub.category].monthly_amount += monthlyAmount;
      }
    });

    const categoryBreakdown = Object.values(categoryMap);

    // Upcoming renewals (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = activeSubscriptions
      .filter(sub => {
        const renewalDate = new Date(sub.next_billing_date);
        return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
      .slice(0, 5);

    res.json({
      totalMonthly: monthlyTotal.toFixed(2),
      totalYearly: yearlyTotal.toFixed(2),
      categoryBreakdown,
      upcomingRenewals,
      totalSubscriptions: activeSubscriptions.length,
      subscriptionsWithAmount,
      subscriptionsWithoutAmount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GMAIL & EMAIL SCANNING ROUTES ====================

// Check Gmail connection status
app.get('/api/gmail/status', (req, res) => {
  try {
    const isConnected = gmailService.checkAuthentication();
    res.json({ connected: isConnected });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Gmail OAuth URL
app.get('/api/gmail/auth-url', (req, res) => {
  try {
    const authUrl = gmailService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gmail OAuth callback
app.get('/api/gmail/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code is required');
    }

    await gmailService.getTokenFromCode(code);

    // Redirect to frontend with success
    res.send(`
      <html>
        <head><title>Gmail Connected</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1 style="color: #10b981;">✅ Gmail Connected Successfully!</h1>
          <p>You can close this window and return to the app.</p>
          <script>
            setTimeout(() => {
              window.close();
              window.opener?.postMessage({ type: 'gmail-connected' }, '*');
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Gmail OAuth error:', error);
    res.status(500).send(`
      <html>
        <head><title>Connection Error</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1 style="color: #ef4444;">❌ Connection Failed</h1>
          <p>${error.message}</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }
});

// Disconnect Gmail
app.post('/api/gmail/disconnect', async (req, res) => {
  try {
    await gmailService.disconnect();
    res.json({ message: 'Gmail disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scan emails for subscriptions
app.post('/api/gmail/scan', async (req, res) => {
  try {
    const { maxResults = 50, daysBack = 365 } = req.body;

    // Check authentication
    if (!gmailService.checkAuthentication()) {
      return res.status(401).json({ error: 'Gmail not connected' });
    }

    // Check AI service
    if (!aiService.openai) {
      return res.status(500).json({ error: 'AI service not configured. Please add OPENAI_API_KEY to .env' });
    }

    console.log(`📧 Starting email scan (${maxResults} emails, ${daysBack} days back)...`);

    // Fetch emails
    const emails = await gmailService.scanEmails(maxResults, daysBack);

    if (emails.length === 0) {
      return res.json({ detected: [], count: 0, message: 'No subscription emails found' });
    }

    // Process with AI
    const detectedSubscriptions = await aiService.processEmailBatch(emails);

    // Save detected subscriptions
    const detectedData = await readDetected();
    detectedData.detected = detectedSubscriptions;
    detectedData.lastScan = new Date().toISOString();
    await writeDetected(detectedData);

    console.log(`✅ Scan complete! Found ${detectedSubscriptions.length} subscriptions`);

    res.json({
      detected: detectedSubscriptions,
      count: detectedSubscriptions.length,
      scannedEmails: emails.length,
      lastScan: detectedData.lastScan
    });
  } catch (error) {
    console.error('Email scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deep 365-day scan with analysis
app.post('/api/gmail/deep-scan', async (req, res) => {
  try {
    // Check authentication
    if (!gmailService.checkAuthentication()) {
      return res.status(401).json({ error: 'Gmail not connected' });
    }

    // Check AI service
    if (!aiService.openai) {
      return res.status(500).json({ error: 'AI service not configured. Please add OPENAI_API_KEY to .env' });
    }

    console.log('🔍 Starting DEEP 365-day email scan with analysis...');

    // Import analysis service
    const { default: analysisService } = await import('./services/analysisService.js');

    // Perform deep scan
    const emails = await gmailService.deepScan365Days((progress) => {
      console.log(`Progress: ${progress.phase} - ${progress.percentage || 0}%`);
    });

    if (emails.length === 0) {
      return res.json({
        detected: [],
        analysis: null,
        message: 'No subscription emails found in the past 365 days',
      });
    }

    console.log(`🤖 Processing ${emails.length} emails with AI...`);

    // Process with AI
    const detectedSubscriptions = await aiService.processEmailBatch(emails);

    // Deduplicate
    const deduplicated = analysisService.deduplicateSubscriptions(detectedSubscriptions);

    // Detect price changes
    const priceChanges = await analysisService.detectPriceChanges(deduplicated);

    // Generate insights report
    const analysis = await analysisService.generateInsightsReport(deduplicated, priceChanges);

    // Save detected subscriptions
    const detectedData = await readDetected();
    detectedData.detected = deduplicated;
    detectedData.lastScan = new Date().toISOString();
    detectedData.deepScanAnalysis = analysis;
    await writeDetected(detectedData);

    console.log(`✅ Deep scan complete! Found ${deduplicated.length} unique subscriptions`);
    console.log(`💰 Estimated annual cost: ₹${analysis.summary.estimatedAnnualCost}`);
    console.log(`📊 Price changes detected: ${priceChanges.length}`);

    res.json({
      detected: deduplicated,
      count: deduplicated.length,
      scannedEmails: emails.length,
      analysis: analysis,
      priceChanges: priceChanges,
      lastScan: detectedData.lastScan,
    });
  } catch (error) {
    console.error('Deep scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detected subscriptions
app.get('/api/gmail/detected', async (req, res) => {
  try {
    const detectedData = await readDetected();
    res.json(detectedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import detected subscription to main list
app.post('/api/gmail/import/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const detectedData = await readDetected();

    if (index < 0 || index >= detectedData.detected.length) {
      return res.status(404).json({ error: 'Detected subscription not found' });
    }

    const detected = detectedData.detected[index];

    // Add to main subscriptions
    const db = await readDB();
    const newSubscription = {
      id: db.nextId++,
      name: detected.serviceName,
      category: detected.category,
      amount: detected.amount,
      currency: detected.currency || 'USD',
      billing_cycle: detected.billingCycle,
      next_billing_date: detected.nextBillingDate,
      status: 'active',
      description: detected.description || `Auto-detected from email`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'email-import'
    };

    db.subscriptions.push(newSubscription);
    await writeDB(db);

    // Remove from detected list
    detectedData.detected.splice(index, 1);
    await writeDetected(detectedData);

    res.status(201).json(newSubscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dismiss detected subscription
app.delete('/api/gmail/detected/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const detectedData = await readDetected();

    if (index < 0 || index >= detectedData.detected.length) {
      return res.status(404).json({ error: 'Detected subscription not found' });
    }

    detectedData.detected.splice(index, 1);
    await writeDetected(detectedData);

    res.json({ message: 'Detected subscription dismissed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== END GMAIL ROUTES ====================

// ==================== NOTIFICATION ROUTES ====================

// Get email configuration (without sensitive data)
app.get('/api/notifications/email-config', (req, res) => {
  try {
    const config = notificationService.getEmailConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update email configuration
app.put('/api/notifications/email-config', async (req, res) => {
  try {
    const { enabled, service, host, port, secure, auth, from, remindAt } = req.body;

    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (service) updates.service = service;
    if (host) updates.host = host;
    if (port !== undefined) updates.port = port;
    if (secure !== undefined) updates.secure = secure;
    if (auth) updates.auth = auth;
    if (from) updates.from = from;
    if (remindAt) updates.remindAt = remindAt;

    await notificationService.updateEmailConfig(updates);

    res.json({ message: 'Email configuration updated', config: notificationService.getEmailConfig() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test email configuration
app.post('/api/notifications/test-email', async (req, res) => {
  try {
    // Send a test email
    const testSub = {
      id: 0,
      name: 'Test Subscription',
      category: 'Test',
      amount: 99.99,
      currency: 'INR',
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'This is a test email from SubManager AI',
    };

    await notificationService.sendRenewalEmail(testSub, 7);

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get in-app notifications
app.get('/api/notifications/in-app', (req, res) => {
  try {
    const notifications = notificationService.getInAppNotifications();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await notificationService.markAsRead(parseFloat(req.params.id));
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    await notificationService.markAllAsRead();
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sent email history
app.get('/api/notifications/sent-history', (req, res) => {
  try {
    const history = notificationService.getSentHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger renewal check
app.post('/api/notifications/check-renewals', async (req, res) => {
  try {
    const db = await readDB();
    const activeSubscriptions = db.subscriptions.filter(s => s.status === 'active');

    const result = await notificationService.checkRenewals(activeSubscriptions);

    res.json({
      message: 'Renewal check completed',
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== END NOTIFICATION ROUTES ====================

// ==================== PLAID / BANK INTEGRATION ROUTES ====================

import { mockConnectBank, getMockBanks, detectRecurringPatterns } from './mock-indian-banks.js';

// Check if Plaid is configured (now returns mock mode)
app.get('/api/plaid/status', (req, res) => {
  res.json({ configured: true, mode: 'mock', message: 'Using Mock Indian Banks' });
});

// Get available mock Indian banks
app.get('/api/plaid/mock-banks', (req, res) => {
  res.json(getMockBanks());
});

// Create link token (mock mode - returns mock token)
app.post('/api/plaid/create-link-token', async (req, res) => {
  try {
    // Return mock link token for Indian banks
    res.json({
      link_token: 'mock-link-token-indian-banks',
      expiration: new Date(Date.now() + 3600000).toISOString(),
      mode: 'mock',
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exchange public token for access token and save account (MOCK MODE)
app.post('/api/plaid/exchange-token', async (req, res) => {
  try {
    const { bankId } = req.body; // Mock: we'll pass bankId from frontend

    // Mock: Connect to Indian bank
    const mockData = mockConnectBank(bankId || 'hdfc');

    // Save to database
    const accountsDB = await readConnectedAccounts();
    const newAccount = {
      id: accountsDB.nextId++,
      itemId: mockData.itemId,
      accessToken: `mock_token_${bankId}_${Date.now()}`,
      institutionId: mockData.institution.id,
      institutionName: mockData.institution.name,
      accounts: mockData.accounts,
      connectedAt: new Date().toISOString(),
      lastSync: null,
      mode: 'mock',
    };

    accountsDB.accounts.push(newAccount);
    await writeConnectedAccounts(accountsDB);

    // Save transactions
    const transactionsDB = await readTransactions();
    transactionsDB.transactions = [
      ...transactionsDB.transactions,
      ...mockData.transactions.map(t => ({ ...t, accountId: newAccount.id })),
    ];
    transactionsDB.lastSync = new Date().toISOString();
    await writeTransactions(transactionsDB);

    // Update account sync time
    newAccount.lastSync = new Date().toISOString();
    await writeConnectedAccounts(accountsDB);

    // Detect recurring patterns
    const recurringPatterns = detectRecurringPatterns(mockData.transactions);

    // Save detected subscriptions
    const detectedDB = await readDetectedBank();
    recurringPatterns.forEach(pattern => {
      const exists = detectedDB.detectedSubscriptions.some(d =>
        d.merchant === pattern.merchant &&
        Math.abs(d.amount - pattern.amount) < 0.01
      );

      if (!exists) {
        detectedDB.detectedSubscriptions.push({
          id: detectedDB.nextId++,
          merchant: pattern.merchant,
          amount: pattern.amount,
          billingCycle: pattern.billingCycle,
          confidence: pattern.confidence,
          transactionCount: pattern.transactionCount,
          lastTransaction: pattern.lastTransaction,
          detectedAt: new Date().toISOString(),
          accountId: newAccount.id,
        });
      }
    });

    await writeDetectedBank(detectedDB);

    console.log(`✅ Mock: Connected ${mockData.institution.name}, detected ${recurringPatterns.length} subscriptions`);

    res.json({ success: true, account: newAccount });
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all connected accounts
app.get('/api/plaid/accounts', async (req, res) => {
  try {
    const accountsDB = await readConnectedAccounts();
    // Don't send access tokens to frontend
    const sanitized = accountsDB.accounts.map(acc => ({
      ...acc,
      accessToken: undefined,
    }));
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync transactions for an account
app.post('/api/plaid/sync/:accountId', async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    await syncAccountTransactions(accountId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all transactions
app.get('/api/plaid/transactions', async (req, res) => {
  try {
    const transactionsDB = await readTransactions();
    res.json(transactionsDB);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detected subscriptions from bank
app.get('/api/plaid/detected-subscriptions', async (req, res) => {
  try {
    const detectedDB = await readDetectedBank();
    res.json(detectedDB.detectedSubscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import detected subscription from bank
app.post('/api/plaid/import/:detectedId', async (req, res) => {
  try {
    const detectedId = parseInt(req.params.detectedId);
    const detectedDB = await readDetectedBank();
    const index = detectedDB.detectedSubscriptions.findIndex(d => d.id === detectedId);

    if (index === -1) {
      return res.status(404).json({ error: 'Detected subscription not found' });
    }

    const detected = detectedDB.detectedSubscriptions[index];

    // Create subscription
    const db = await readDB();
    const newSubscription = {
      id: db.nextId++,
      name: detected.merchant,
      category: 'Other',
      amount: detected.amount,
      currency: 'USD',
      billing_cycle: detected.billingCycle,
      next_billing_date: null,
      status: 'active',
      description: `Imported from bank transactions (${detected.transactionCount} transactions detected)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'bank-import',
    };

    db.subscriptions.push(newSubscription);
    await writeDB(db);

    // Remove from detected
    detectedDB.detectedSubscriptions.splice(index, 1);
    await writeDetectedBank(detectedDB);

    res.json(newSubscription);
  } catch (error) {
    console.error('Error importing subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dismiss detected subscription from bank
app.delete('/api/plaid/detected/:detectedId', async (req, res) => {
  try {
    const detectedId = parseInt(req.params.detectedId);
    const detectedDB = await readDetectedBank();
    const index = detectedDB.detectedSubscriptions.findIndex(d => d.id === detectedId);

    if (index === -1) {
      return res.status(404).json({ error: 'Detected subscription not found' });
    }

    detectedDB.detectedSubscriptions.splice(index, 1);
    await writeDetectedBank(detectedDB);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove connected account
app.delete('/api/plaid/accounts/:accountId', async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const accountsDB = await readConnectedAccounts();
    const index = accountsDB.accounts.findIndex(acc => acc.id === accountId);

    if (index === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountsDB.accounts[index];

    // Remove from Plaid
    await plaidService.removeItem(account.accessToken);

    // Remove from database
    accountsDB.accounts.splice(index, 1);
    await writeConnectedAccounts(accountsDB);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing account:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to sync transactions for an account
async function syncAccountTransactions(accountId) {
  const accountsDB = await readConnectedAccounts();
  const account = accountsDB.accounts.find(acc => acc.id === accountId);

  if (!account) {
    throw new Error('Account not found');
  }

  // Get transactions for last 90 days
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const transactionsData = await plaidService.getTransactions(account.accessToken, startDate, endDate);

  // Save transactions
  const transactionsDB = await readTransactions();
  transactionsDB.transactions = [
    ...transactionsDB.transactions.filter(t => t.accountId !== accountId),
    ...transactionsData.transactions.map(t => ({
      ...t,
      accountId,
    })),
  ];
  transactionsDB.lastSync = new Date().toISOString();
  await writeTransactions(transactionsDB);

  // Update account sync time
  account.lastSync = new Date().toISOString();
  await writeConnectedAccounts(accountsDB);

  // Detect recurring patterns
  const recurringPatterns = plaidService.detectRecurringTransactions(transactionsData.transactions);

  // Save detected subscriptions
  const detectedDB = await readDetectedBank();

  // Add new patterns (avoid duplicates)
  recurringPatterns.forEach(pattern => {
    const exists = detectedDB.detectedSubscriptions.some(d =>
      d.merchant === pattern.merchant &&
      Math.abs(d.amount - pattern.amount) < 0.01
    );

    if (!exists) {
      detectedDB.detectedSubscriptions.push({
        id: detectedDB.nextId++,
        merchant: pattern.merchant,
        amount: pattern.amount,
        billingCycle: pattern.billingCycle,
        confidence: pattern.confidence,
        transactionCount: pattern.transactionCount,
        lastTransaction: pattern.lastTransaction,
        detectedAt: new Date().toISOString(),
        accountId,
      });
    }
  });

  await writeDetectedBank(detectedDB);

  console.log(`✅ Synced ${transactionsData.transactions.length} transactions, detected ${recurringPatterns.length} patterns`);

  return {
    transactionCount: transactionsData.transactions.length,
    patternsDetected: recurringPatterns.length,
  };
}

// ==================== END PLAID ROUTES ====================

// ==================== SCHEDULER ROUTES ====================

// Get scheduler status and configuration
app.get('/api/scheduler/status', (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update scheduler configuration
app.put('/api/scheduler/config', async (req, res) => {
  try {
    const { autoScanEnabled, scanSchedule, scanDaysBack, maxEmailsPerScan, autoImportConfirmed } = req.body;

    const updates = {};
    if (autoScanEnabled !== undefined) updates.autoScanEnabled = autoScanEnabled;
    if (scanSchedule) updates.scanSchedule = scanSchedule;
    if (scanDaysBack) updates.scanDaysBack = scanDaysBack;
    if (maxEmailsPerScan) updates.maxEmailsPerScan = maxEmailsPerScan;
    if (autoImportConfirmed !== undefined) updates.autoImportConfirmed = autoImportConfirmed;

    await schedulerService.updateConfig(updates);

    // Restart scheduler with new config
    if (autoScanEnabled !== false) {
      schedulerService.stopAll();
      await startScheduledJobs();
    } else {
      schedulerService.stopAll();
    }

    res.json({ message: 'Scheduler configuration updated', config: schedulerService.getConfig() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== END SCHEDULER ROUTES ====================

// Callback function for scheduled email scans
async function performScheduledScan(options) {
  try {
    // Check if Gmail is connected
    if (!gmailService.checkAuthentication()) {
      console.log('⏸️  Skipping scheduled scan: Gmail not connected');
      return { detected: [], skipped: true };
    }

    // Scan emails
    const emails = await gmailService.searchEmails(options.maxResults, options.daysBack);
    console.log(`📧 Processing ${emails.length} emails from scheduled scan...`);

    const detectedSubscriptions = [];

    for (const email of emails) {
      const analysis = await aiService.analyzeEmail(email);

      if (analysis.isSubscription) {
        detectedSubscriptions.push({
          ...analysis,
          emailId: email.id,
          emailSubject: email.subject,
          emailFrom: email.from,
        });
      }
    }

    // Save detected subscriptions
    const detectedDB = await readDetectedDB();

    // Merge with existing, avoiding duplicates by emailId
    const existingIds = new Set(detectedDB.detected.map(s => s.emailId));
    const newSubs = detectedSubscriptions.filter(s => !existingIds.has(s.emailId));

    // Auto-import confirmed subscriptions if enabled
    const config = schedulerService.getConfig();
    let autoImported = 0;
    let pendingReview = [];

    if (config.autoImportConfirmed) {
      const db = await readDB();
      const existingSubNames = new Set(db.subscriptions.map(s => s.name.toLowerCase()));

      for (const sub of newSubs) {
        // Auto-import if: confirmed subscription type, high confidence, and not already in database
        const shouldAutoImport = (
          (sub.emailType === 'confirmed_subscription' || sub.isConfirmationEmail) &&
          sub.confidence >= 85 &&
          !existingSubNames.has(sub.serviceName.toLowerCase())
        );

        if (shouldAutoImport) {
          // Import to main subscriptions
          const newSubscription = {
            id: db.nextId++,
            name: sub.serviceName,
            category: sub.category || 'Other',
            amount: sub.amount,
            currency: sub.currency || 'INR',
            billing_cycle: sub.billingCycle || 'monthly',
            next_billing_date: sub.nextBillingDate,
            status: 'active',
            description: sub.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source: 'auto-import',
          };

          db.subscriptions.push(newSubscription);
          existingSubNames.add(sub.serviceName.toLowerCase());
          autoImported++;

          // Create notification for auto-import
          await notificationService.notifyAutoImport(sub.serviceName, sub.amount, sub.currency);

          console.log(`✅ Auto-imported: ${sub.serviceName} (confidence: ${sub.confidence}%)`);
        } else {
          // Keep in detected list for manual review
          pendingReview.push(sub);
        }
      }

      await writeDB(db);
    } else {
      // All subscriptions pending review
      pendingReview = newSubs;
    }

    detectedDB.detected = [...pendingReview, ...detectedDB.detected];
    detectedDB.lastScan = new Date().toISOString();

    await writeDetectedDB(detectedDB);

    // Create notification for scan completion
    if (newSubs.length > 0) {
      await notificationService.notifyScanCompleted(newSubs.length, autoImported);
    }

    console.log(`✅ Scheduled scan: ${newSubs.length} new, ${autoImported} auto-imported, ${pendingReview.length} pending review`);

    return { detected: newSubs, autoImported, pendingReview: pendingReview.length, total: detectedSubscriptions.length };
  } catch (error) {
    console.error('❌ Scheduled scan error:', error);
    throw error;
  }
}

// Callback function for checking renewals
async function checkRenewals() {
  try {
    const db = await readDB();
    const activeSubscriptions = db.subscriptions.filter(s => s.status === 'active');

    const result = await notificationService.checkRenewals(activeSubscriptions);
    console.log(`🔔 Renewal check: ${result.checked} checked, ${result.sent} emails sent, ${result.inApp} in-app notifications`);

    return result;
  } catch (error) {
    console.error('❌ Renewal check error:', error);
    throw error;
  }
}

// Start all scheduled jobs
async function startScheduledJobs() {
  const config = schedulerService.getConfig();

  // Schedule email scanning
  if (config.autoScanEnabled) {
    schedulerService.scheduleEmailScan(performScheduledScan);
  }

  // Schedule renewal reminders (runs daily at 9 AM)
  schedulerService.scheduleRenewalReminders(checkRenewals);
}

// Initialize and start server
Promise.all([initDB(), initServices()]).then(async () => {
  // Start scheduled jobs
  await startScheduledJobs();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
