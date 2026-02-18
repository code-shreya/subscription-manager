import { db } from '../../config/database';
import { ConnectedAccount, BankTransaction as DBBankTransaction } from '../../db/types';
import { BankProvider, BankInfo, BankConnectionResult, ConsentRequest, ConsentStatus } from './providers/bank-provider.interface';
import { mockBankProvider } from './providers/mock-bank-provider';
import { createAccountAggregatorProvider } from './providers/account-aggregator-provider';

/**
 * Bank Service
 * Manages bank connections and transactions using provider abstraction
 */
export class BankService {
  private provider: BankProvider;

  constructor() {
    // Use mock provider in development, AA provider in production
    this.provider = this.initializeProvider();
  }

  /**
   * Initialize the appropriate bank provider
   */
  private initializeProvider(): BankProvider {
    const useProduction = process.env.USE_PRODUCTION_BANK_PROVIDER === 'true';

    if (useProduction) {
      try {
        return createAccountAggregatorProvider();
      } catch (error) {
        console.warn('Account Aggregator provider not configured, falling back to mock provider:', error);
        return mockBankProvider;
      }
    }

    return mockBankProvider;
  }

  /**
   * Get list of supported banks
   */
  async getSupportedBanks(): Promise<BankInfo[]> {
    return this.provider.getSupportedBanks();
  }

  /**
   * Initiate bank connection with consent
   */
  async connectBank(userId: string, bankId: string): Promise<{
    accountId: string;
    consentId: string;
    consentUrl?: string;
    status: string;
  }> {
    // Check if bank is supported
    const banks = await this.provider.getSupportedBanks();
    const bank = banks.find((b) => b.id === bankId);

    if (!bank) {
      throw new Error(`Bank not supported: ${bankId}`);
    }

    // Check if already connected
    const existingAccount = await db.query<ConnectedAccount>(
      `SELECT id FROM connected_accounts
       WHERE user_id = $1 AND account_type = 'bank' AND metadata->>'bankId' = $2 AND status = 'active'
       LIMIT 1`,
      [userId, bankId]
    );

    if (existingAccount.rows.length > 0) {
      throw new Error(`Already connected to ${bank.name}`);
    }

    // Create consent request
    const consentRequest: ConsentRequest = {
      userId,
      bankId,
      purpose: 'Subscription tracking and financial management',
      dataTypes: ['transactions', 'accounts', 'balance'],
      dateRange: {
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 1 year
        to: new Date(),
      },
    };

    // Initiate connection via provider
    const connection = await this.provider.initiateConnection(consentRequest);

    // Create connected account record
    const accountResult = await db.query<ConnectedAccount>(
      `INSERT INTO connected_accounts (
        user_id, account_type, account_identifier, display_name,
        status, metadata, sync_frequency_hours
      )
      VALUES ($1, 'bank', $2, $3, $4, $5, 24)
      RETURNING *`,
      [
        userId,
        bankId,
        bank.name,
        connection.status === 'approved' ? 'active' : 'disconnected',
        JSON.stringify({
          bankId,
          bankName: bank.name,
          consentId: connection.consentId,
          providerName: this.provider.providerName,
        }),
      ]
    );

    const account = accountResult.rows[0];

    // If consent is auto-approved (mock mode), fetch and store data immediately
    if (connection.status === 'approved') {
      await this.syncBankData(userId, account.id, connection.consentId);
    }

    return {
      accountId: account.id,
      consentId: connection.consentId,
      consentUrl: connection.consentUrl,
      status: connection.status,
    };
  }

  /**
   * Check consent status for a bank connection
   */
  async getConsentStatus(userId: string, accountId: string): Promise<ConsentStatus> {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account || account.account_type !== 'bank') {
      throw new Error('Bank account not found');
    }

    const metadata = account.metadata as any;
    const consentId = metadata.consentId;

    if (!consentId) {
      throw new Error('Consent ID not found');
    }

    return this.provider.getConsentStatus(consentId);
  }

  /**
   * Sync bank data (accounts + transactions) for a connected account
   */
  async syncBankData(userId: string, accountId: string, consentId?: string): Promise<{
    accountsCount: number;
    transactionsCount: number;
  }> {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account || account.account_type !== 'bank') {
      throw new Error('Bank account not found');
    }

    const metadata = account.metadata as any;
    const finalConsentId = consentId || metadata.consentId;

    if (!finalConsentId) {
      throw new Error('Consent ID not found');
    }

    // Fetch data from provider
    const bankData: BankConnectionResult = await this.provider.fetchBankData(finalConsentId);

    // Store transactions in database
    let transactionsCount = 0;

    for (const transaction of bankData.transactions) {
      // Check if transaction already exists
      const existing = await db.query(
        `SELECT id FROM bank_transactions
         WHERE user_id = $1 AND transaction_id = $2
         LIMIT 1`,
        [userId, transaction.transactionId]
      );

      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO bank_transactions (
            user_id, connected_account_id, transaction_id, transaction_date,
            description, amount, currency, transaction_type, category,
            merchant_name, is_recurring, raw_data
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11)`,
          [
            userId,
            accountId,
            transaction.transactionId,
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.currency,
            transaction.type,
            transaction.category,
            transaction.merchantName,
            JSON.stringify(transaction),
          ]
        );

        transactionsCount++;
      }
    }

    // Update last_synced_at
    await db.query(
      `UPDATE connected_accounts
       SET last_synced_at = CURRENT_TIMESTAMP,
           status = 'active',
           metadata = jsonb_set(
             metadata,
             '{lastSyncStats}',
             $2::jsonb
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        accountId,
        JSON.stringify({
          accountsCount: bankData.accounts.length,
          transactionsCount,
          lastSyncAt: new Date().toISOString(),
        }),
      ]
    );

    return {
      accountsCount: bankData.accounts.length,
      transactionsCount,
    };
  }

  /**
   * Get all bank connections for a user
   */
  async getBankConnections(userId: string): Promise<ConnectedAccount[]> {
    const result = await db.query<ConnectedAccount>(
      `SELECT id, user_id, account_type, account_identifier, display_name,
              status, last_synced_at, sync_frequency_hours, metadata,
              created_at, updated_at
       FROM connected_accounts
       WHERE user_id = $1 AND account_type = 'bank'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get connected account by ID
   */
  async getConnectedAccount(userId: string, accountId: string): Promise<ConnectedAccount | null> {
    const result = await db.query<ConnectedAccount>(
      `SELECT id, user_id, account_type, account_identifier, display_name,
              status, last_synced_at, sync_frequency_hours, metadata,
              created_at, updated_at
       FROM connected_accounts
       WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get bank transactions for a connected account
   */
  async getBankTransactions(
    userId: string,
    accountId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: DBBankTransaction[]; total: number }> {
    const { fromDate, toDate, limit = 100, offset = 0 } = options || {};

    let query = `
      SELECT id, user_id, connected_account_id, transaction_id, transaction_date,
             description, amount, currency, transaction_type, category,
             merchant_name, is_recurring, subscription_id, raw_data, created_at
      FROM bank_transactions
      WHERE user_id = $1 AND connected_account_id = $2
    `;

    const params: any[] = [userId, accountId];
    let paramIndex = 3;

    if (fromDate) {
      query += ` AND transaction_date >= $${paramIndex++}`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND transaction_date <= $${paramIndex++}`;
      params.push(toDate);
    }

    // Get total count
    const countResult = await db.query(
      query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as count FROM'),
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    query += ` ORDER BY transaction_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await db.query<DBBankTransaction>(query, params);

    return {
      transactions: result.rows,
      total,
    };
  }

  /**
   * Disconnect a bank account
   */
  async disconnectBank(userId: string, accountId: string): Promise<void> {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account || account.account_type !== 'bank') {
      throw new Error('Bank account not found');
    }

    const metadata = account.metadata as any;
    const consentId = metadata.consentId;

    // Revoke consent via provider
    if (consentId) {
      try {
        await this.provider.revokeConsent(consentId);
      } catch (error) {
        console.error('Failed to revoke consent:', error);
        // Continue with disconnection even if revocation fails
      }
    }

    // Update status
    await db.query(
      `UPDATE connected_accounts
       SET status = 'disconnected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );
  }

  /**
   * Detect recurring subscriptions from bank transactions
   */
  async detectRecurringSubscriptions(userId: string, accountId: string): Promise<
    Array<{
      merchantName: string;
      amount: number;
      currency: string;
      frequency: string;
      transactionCount: number;
      firstTransaction: Date;
      lastTransaction: Date;
      transactionIds: string[];
    }>
  > {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account || account.account_type !== 'bank') {
      throw new Error('Bank account not found');
    }

    // Get all transactions for this account
    const { transactions } = await this.getBankTransactions(userId, accountId, {
      limit: 1000,
    });

    // Group by merchant name and amount
    const groups = new Map<
      string,
      {
        transactions: DBBankTransaction[];
        amount: number;
        currency: string;
      }
    >();

    transactions.forEach((txn) => {
      if (txn.transaction_type !== 'debit' || !txn.merchant_name) {
        return;
      }

      const key = `${txn.merchant_name}:${txn.amount}`;
      if (!groups.has(key)) {
        groups.set(key, {
          transactions: [],
          amount: txn.amount,
          currency: txn.currency,
        });
      }

      groups.get(key)!.transactions.push(txn);
    });

    // Analyze groups for recurring patterns
    const recurring: Array<{
      merchantName: string;
      amount: number;
      currency: string;
      frequency: string;
      transactionCount: number;
      firstTransaction: Date;
      lastTransaction: Date;
      transactionIds: string[];
    }> = [];

    groups.forEach((group, key) => {
      const merchantName = key.split(':')[0];
      const txns = group.transactions;

      // Need at least 2 transactions
      if (txns.length < 2) {
        return;
      }

      // Sort by date
      txns.sort((a, b) => a.transaction_date.getTime() - b.transaction_date.getTime());

      // Calculate average interval (in days)
      const intervals: number[] = [];
      for (let i = 1; i < txns.length; i++) {
        const interval = Math.floor(
          (txns[i].transaction_date.getTime() - txns[i - 1].transaction_date.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        intervals.push(interval);
      }

      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

      // Determine frequency
      let frequency = 'irregular';
      if (avgInterval >= 28 && avgInterval <= 32) {
        frequency = 'monthly';
      } else if (avgInterval >= 88 && avgInterval <= 95) {
        frequency = 'quarterly';
      } else if (avgInterval >= 360 && avgInterval <= 370) {
        frequency = 'yearly';
      } else if (avgInterval >= 6 && avgInterval <= 8) {
        frequency = 'weekly';
      }

      if (frequency !== 'irregular') {
        recurring.push({
          merchantName,
          amount: group.amount,
          currency: group.currency,
          frequency,
          transactionCount: txns.length,
          firstTransaction: txns[0].transaction_date,
          lastTransaction: txns[txns.length - 1].transaction_date,
          transactionIds: txns.map((t) => t.id),
        });
      }
    });

    return recurring.sort((a, b) => b.transactionCount - a.transactionCount);
  }

  /**
   * Detect UPI recurring mandates (if supported by provider)
   */
  async detectUpiMandates(userId: string, accountId: string): Promise<
    Array<{
      mandateId: string;
      merchantName: string;
      amount: number;
      frequency: string;
      startDate: Date;
      status: string;
    }>
  > {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account || account.account_type !== 'bank') {
      throw new Error('Bank account not found');
    }

    const metadata = account.metadata as any;
    const itemId = metadata.consentId;

    if (!itemId) {
      throw new Error('Bank connection not initialized');
    }

    // Check if provider supports mandate detection
    if (this.provider.detectUpiMandates) {
      return this.provider.detectUpiMandates(itemId);
    }

    return [];
  }
}

// Export singleton instance
export const bankService = new BankService();
