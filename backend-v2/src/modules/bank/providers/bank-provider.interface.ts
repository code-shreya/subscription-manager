/**
 * Bank Provider Interface
 * Abstract interface for different bank integration providers
 * Supports: Mock (testing), Account Aggregator (production), etc.
 */

export interface BankInfo {
  id: string;
  name: string;
  logo: string;
  color?: string;
}

export interface BankAccount {
  accountId: string;
  name: string;
  mask: string; // Last 4 digits
  type: 'savings' | 'current' | 'credit_card';
  balance?: number;
  currency: string;
}

export interface BankTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  date: Date;
  description: string;
  merchantName: string;
  category: string;
  paymentChannel: 'online' | 'pos' | 'upi' | 'other';
  currency: string;
  type: 'debit' | 'credit';
}

export interface BankConnectionResult {
  itemId: string; // Unique identifier for this connection
  accounts: BankAccount[];
  transactions: BankTransaction[];
  institution: BankInfo;
}

export interface ConsentRequest {
  userId: string;
  bankId: string;
  purpose: string;
  dataTypes: string[]; // ['transactions', 'accounts', 'balance']
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface ConsentStatus {
  consentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedAt?: Date;
  expiresAt?: Date;
}

/**
 * Abstract Bank Provider
 * All bank providers must implement this interface
 */
export abstract class BankProvider {
  abstract providerName: string;

  /**
   * Get list of supported banks
   */
  abstract getSupportedBanks(): Promise<BankInfo[]>;

  /**
   * Initiate bank connection with consent
   */
  abstract initiateConnection(consentRequest: ConsentRequest): Promise<{
    consentId: string;
    consentUrl?: string; // URL for user to approve consent
    status: string;
  }>;

  /**
   * Check consent status
   */
  abstract getConsentStatus(consentId: string): Promise<ConsentStatus>;

  /**
   * Fetch accounts and transactions after consent
   */
  abstract fetchBankData(consentId: string): Promise<BankConnectionResult>;

  /**
   * Revoke consent
   */
  abstract revokeConsent(consentId: string): Promise<void>;

  /**
   * Sync transactions (fetch new transactions)
   */
  abstract syncTransactions(
    itemId: string,
    accountId: string,
    fromDate: Date
  ): Promise<BankTransaction[]>;

  /**
   * Detect UPI recurring mandates
   */
  abstract detectUpiMandates?(itemId: string): Promise<
    Array<{
      mandateId: string;
      merchantName: string;
      amount: number;
      frequency: string;
      startDate: Date;
      status: string;
    }>
  >;
}
