// Mock Indian Bank Integration
// Simulates bank connections and transactions for testing

export const MOCK_INDIAN_BANKS = [
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    logo: '🏦',
    color: '#004C8F',
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    logo: '🏦',
    color: '#F37021',
  },
  {
    id: 'sbi',
    name: 'State Bank of India',
    logo: '🏦',
    color: '#22408F',
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    logo: '🏦',
    color: '#97144D',
  },
  {
    id: 'kotak',
    name: 'Kotak Mahindra Bank',
    logo: '🏦',
    color: '#ED232A',
  },
];

// Mock Indian subscription transactions
export const MOCK_INDIAN_TRANSACTIONS = [
  // Netflix India
  {
    merchant: 'Netflix India',
    amount: 649,
    currency: 'INR',
    dates: ['2026-01-15', '2025-12-15', '2025-11-15', '2025-10-15'],
    category: 'Streaming',
  },
  // Disney+ Hotstar
  {
    merchant: 'Disney+ Hotstar',
    amount: 1499,
    currency: 'INR',
    dates: ['2026-01-20', '2025-10-20', '2025-07-20'],
    category: 'Streaming',
  },
  // Amazon Prime India
  {
    merchant: 'Amazon Prime',
    amount: 1499,
    currency: 'INR',
    dates: ['2025-08-10'],
    category: 'Streaming',
  },
  // Spotify India
  {
    merchant: 'Spotify India',
    amount: 119,
    currency: 'INR',
    dates: ['2026-02-05', '2026-01-05', '2025-12-05', '2025-11-05'],
    category: 'Music',
  },
  // YouTube Premium
  {
    merchant: 'YouTube Premium',
    amount: 129,
    currency: 'INR',
    dates: ['2026-01-28', '2025-12-28', '2025-11-28'],
    category: 'Streaming',
  },
  // Zomato Pro
  {
    merchant: 'Zomato Pro',
    amount: 599,
    currency: 'INR',
    dates: ['2026-01-12', '2025-10-12', '2025-07-12'],
    category: 'Food & Dining',
  },
  // Swiggy One
  {
    merchant: 'Swiggy One',
    amount: 899,
    currency: 'INR',
    dates: ['2026-02-01', '2025-11-01', '2025-08-01'],
    category: 'Food & Dining',
  },
  // Adobe Creative Cloud
  {
    merchant: 'Adobe Creative Cloud',
    amount: 1675,
    currency: 'INR',
    dates: ['2026-01-18', '2025-12-18', '2025-11-18'],
    category: 'Software',
  },
  // Microsoft 365
  {
    merchant: 'Microsoft 365',
    amount: 489,
    currency: 'INR',
    dates: ['2026-02-10', '2026-01-10', '2025-12-10', '2025-11-10'],
    category: 'Software',
  },
  // LinkedIn Premium
  {
    merchant: 'LinkedIn Premium',
    amount: 1699,
    currency: 'INR',
    dates: ['2026-01-25', '2025-12-25', '2025-11-25'],
    category: 'Professional',
  },
  // Cult.fit
  {
    merchant: 'Cult.fit',
    amount: 999,
    currency: 'INR',
    dates: ['2026-02-08', '2026-01-08', '2025-12-08'],
    category: 'Fitness',
  },
  // Times Prime
  {
    merchant: 'Times Prime',
    amount: 999,
    currency: 'INR',
    dates: ['2025-09-15'],
    category: 'Lifestyle',
  },
  // MX Player
  {
    merchant: 'MX Player',
    amount: 299,
    currency: 'INR',
    dates: ['2026-02-03', '2026-01-03', '2025-12-03', '2025-11-03'],
    category: 'Streaming',
  },
];

// Generate realistic transaction data
function generateTransactions(subscriptionPattern, accountId) {
  return subscriptionPattern.dates.map((date, index) => ({
    transaction_id: `mock_${subscriptionPattern.merchant.replace(/\s+/g, '_')}_${date}_${accountId}`,
    account_id: accountId,
    amount: subscriptionPattern.amount,
    date: date,
    name: subscriptionPattern.merchant,
    merchant_name: subscriptionPattern.merchant,
    category: [subscriptionPattern.category],
    payment_channel: 'online',
    currency: subscriptionPattern.currency,
  }));
}

// Mock bank connection
export function mockConnectBank(bankId) {
  const bank = MOCK_INDIAN_BANKS.find(b => b.id === bankId);

  if (!bank) {
    throw new Error('Bank not found');
  }

  // Simulate account data
  const mockAccount = {
    account_id: `mock_acc_${bankId}_${Date.now()}`,
    name: `${bank.name} Savings Account`,
    mask: '4242',
    type: 'depository',
    subtype: 'savings',
  };

  // Generate all transactions
  const allTransactions = [];
  MOCK_INDIAN_TRANSACTIONS.forEach(pattern => {
    allTransactions.push(...generateTransactions(pattern, mockAccount.account_id));
  });

  // Sort by date (most recent first)
  allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    itemId: `mock_item_${bankId}_${Date.now()}`,
    accounts: [mockAccount],
    transactions: allTransactions,
    institution: bank,
  };
}

// Detect recurring patterns from mock transactions
export function detectRecurringPatterns(transactions) {
  const merchantGroups = {};

  transactions.forEach(txn => {
    const merchant = txn.merchant_name || txn.name;
    const amount = Math.abs(txn.amount);

    if (!merchantGroups[merchant]) {
      merchantGroups[merchant] = [];
    }

    merchantGroups[merchant].push({
      date: txn.date,
      amount: amount,
      transactionId: txn.transaction_id,
    });
  });

  const recurringPatterns = [];

  Object.entries(merchantGroups).forEach(([merchant, txns]) => {
    if (txns.length < 2) return;

    txns.sort((a, b) => new Date(a.date) - new Date(b.date));

    const amounts = txns.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountVariance = amounts.every(amt => Math.abs(amt - avgAmount) < avgAmount * 0.1);

    if (txns.length >= 2) {
      const intervals = [];
      for (let i = 1; i < txns.length; i++) {
        const days = Math.round(
          (new Date(txns[i].date) - new Date(txns[i - 1].date)) / (1000 * 60 * 60 * 24)
        );
        intervals.push(days);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      let billingCycle = 'monthly';
      let confidence = 0;

      if (avgInterval >= 28 && avgInterval <= 31) {
        billingCycle = 'monthly';
        confidence = amountVariance ? 0.9 : 0.7;
      } else if (avgInterval >= 89 && avgInterval <= 92) {
        billingCycle = 'quarterly';
        confidence = amountVariance ? 0.85 : 0.65;
      } else if (avgInterval >= 358 && avgInterval <= 370) {
        billingCycle = 'yearly';
        confidence = amountVariance ? 0.9 : 0.7;
      } else if (avgInterval >= 6 && avgInterval <= 8) {
        billingCycle = 'weekly';
        confidence = amountVariance ? 0.85 : 0.65;
      } else {
        confidence = 0.5;
      }

      if (confidence >= 0.6 && txns.length >= 2) {
        recurringPatterns.push({
          merchant,
          amount: avgAmount,
          billingCycle,
          confidence,
          transactionCount: txns.length,
          lastTransaction: txns[txns.length - 1],
          transactions: txns,
        });
      }
    }
  });

  return recurringPatterns.sort((a, b) => b.confidence - a.confidence);
}

// Get list of available mock banks
export function getMockBanks() {
  return MOCK_INDIAN_BANKS;
}
