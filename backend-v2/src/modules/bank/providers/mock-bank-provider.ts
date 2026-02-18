import {
  BankProvider,
  BankInfo,
  BankAccount,
  BankTransaction,
  BankConnectionResult,
  ConsentRequest,
  ConsentStatus,
} from './bank-provider.interface';

/**
 * Mock Bank Provider
 * Simulates bank connections for testing and development
 * PRESERVES exact mock data from original mock-indian-banks.js
 */

// PRESERVED: Mock Indian Banks (from original mock-indian-banks.js)
const MOCK_INDIAN_BANKS: BankInfo[] = [
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

// PRESERVED: Mock Indian subscription transactions (from original)
interface MockTransactionPattern {
  merchant: string;
  amount: number;
  currency: string;
  dates: string[];
  category: string;
}

const MOCK_INDIAN_TRANSACTIONS: MockTransactionPattern[] = [
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

/**
 * Mock Bank Provider Implementation
 */
export class MockBankProvider extends BankProvider {
  providerName = 'mock';
  private consents: Map<string, ConsentStatus> = new Map();
  private connections: Map<string, BankConnectionResult> = new Map();

  /**
   * Get list of supported banks
   */
  async getSupportedBanks(): Promise<BankInfo[]> {
    return MOCK_INDIAN_BANKS;
  }

  /**
   * Initiate bank connection (mock - auto-approved)
   */
  async initiateConnection(consentRequest: ConsentRequest): Promise<{
    consentId: string;
    consentUrl?: string;
    status: string;
  }> {
    const bank = MOCK_INDIAN_BANKS.find((b) => b.id === consentRequest.bankId);

    if (!bank) {
      throw new Error('Bank not found');
    }

    const consentId = `mock_consent_${consentRequest.bankId}_${Date.now()}`;

    // Auto-approve consent in mock mode
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days validity

    this.consents.set(consentId, {
      consentId,
      status: 'approved',
      approvedAt: new Date(),
      expiresAt,
    });

    // Generate mock bank data
    const connectionData = this.generateMockBankData(bank, consentId);
    this.connections.set(consentId, connectionData);

    return {
      consentId,
      consentUrl: undefined, // No URL needed for mock
      status: 'approved',
    };
  }

  /**
   * Check consent status
   */
  async getConsentStatus(consentId: string): Promise<ConsentStatus> {
    const consent = this.consents.get(consentId);

    if (!consent) {
      throw new Error('Consent not found');
    }

    // Check if expired
    if (consent.expiresAt && new Date() > consent.expiresAt) {
      consent.status = 'expired';
    }

    return consent;
  }

  /**
   * Fetch bank data (accounts + transactions)
   */
  async fetchBankData(consentId: string): Promise<BankConnectionResult> {
    const consent = await this.getConsentStatus(consentId);

    if (consent.status !== 'approved') {
      throw new Error(`Consent not approved. Status: ${consent.status}`);
    }

    const connectionData = this.connections.get(consentId);

    if (!connectionData) {
      throw new Error('Connection data not found');
    }

    return connectionData;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(consentId: string): Promise<void> {
    const consent = this.consents.get(consentId);

    if (!consent) {
      throw new Error('Consent not found');
    }

    consent.status = 'rejected';
    this.connections.delete(consentId);
  }

  /**
   * Sync transactions (mock - returns same data)
   */
  async syncTransactions(
    itemId: string,
    accountId: string,
    fromDate: Date
  ): Promise<BankTransaction[]> {
    const connection = Array.from(this.connections.values()).find((c) => c.itemId === itemId);

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Filter transactions by date and account
    return connection.transactions.filter(
      (txn) => txn.accountId === accountId && txn.date >= fromDate
    );
  }

  /**
   * Detect UPI recurring mandates (mock - returns empty)
   */
  async detectUpiMandates(_itemId: string): Promise<
    Array<{
      mandateId: string;
      merchantName: string;
      amount: number;
      frequency: string;
      startDate: Date;
      status: string;
    }>
  > {
    // Mock UPI mandates
    return [
      {
        mandateId: 'mock_mandate_netflix',
        merchantName: 'Netflix India',
        amount: 649,
        frequency: 'monthly',
        startDate: new Date('2025-10-15'),
        status: 'active',
      },
      {
        mandateId: 'mock_mandate_spotify',
        merchantName: 'Spotify India',
        amount: 119,
        frequency: 'monthly',
        startDate: new Date('2025-11-05'),
        status: 'active',
      },
    ];
  }

  /**
   * Generate realistic mock bank data
   * PRESERVED from original generateTransactions() function
   */
  private generateMockBankData(bank: BankInfo, itemId: string): BankConnectionResult {
    const accountId = `mock_acc_${bank.id}_${Date.now()}`;

    // Create mock account
    const mockAccount: BankAccount = {
      accountId,
      name: `${bank.name} Savings Account`,
      mask: '4242',
      type: 'savings',
      balance: 125000, // Mock balance
      currency: 'INR',
    };

    // Generate all transactions from patterns
    const allTransactions: BankTransaction[] = [];

    MOCK_INDIAN_TRANSACTIONS.forEach((pattern) => {
      pattern.dates.forEach((dateStr) => {
        allTransactions.push({
          transactionId: `mock_${pattern.merchant.replace(/\s+/g, '_')}_${dateStr}_${accountId}`,
          accountId,
          amount: pattern.amount,
          date: new Date(dateStr),
          description: pattern.merchant,
          merchantName: pattern.merchant,
          category: pattern.category,
          paymentChannel: 'online',
          currency: pattern.currency,
          type: 'debit',
        });
      });
    });

    // Sort by date (most recent first)
    allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      itemId,
      accounts: [mockAccount],
      transactions: allTransactions,
      institution: bank,
    };
  }
}

// Export singleton instance
export const mockBankProvider = new MockBankProvider();
