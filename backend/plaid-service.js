import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

class PlaidService {
  constructor() {
    // Check if Plaid credentials are configured
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      console.warn('⚠️  Plaid credentials not configured. Bank integration will not work.');
      console.warn('   Sign up at: https://dashboard.plaid.com/signup');
      this.configured = false;
      return;
    }

    this.configured = true;

    // Plaid client configuration
    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
  }

  /**
   * Check if Plaid is configured
   */
  isConfigured() {
    return this.configured;
  }

  /**
   * Create a link token for Plaid Link
   * @param {string} userId - User identifier
   * @returns {Promise<object>} Link token response
   */
  async createLinkToken(userId = 'user-1') {
    if (!this.configured) {
      throw new Error('Plaid not configured. Please add credentials to .env file.');
    }

    try {
      const response = await this.plaidClient.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'SubManager',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: 'https://webhook.example.com',
      });
      return response.data;
    } catch (error) {
      console.error('Error creating link token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Exchange public token for access token
   * @param {string} publicToken - Public token from Plaid Link
   * @returns {Promise<object>} Access token and item ID
   */
  async exchangePublicToken(publicToken) {
    if (!this.configured) {
      throw new Error('Plaid not configured');
    }

    try {
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get accounts for an access token
   * @param {string} accessToken - Access token
   * @returns {Promise<object>} Accounts data
   */
  async getAccounts(accessToken) {
    if (!this.configured) {
      throw new Error('Plaid not configured');
    }

    try {
      const response = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting accounts:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get transactions for an access token
   * @param {string} accessToken - Access token
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<object>} Transactions data
   */
  async getTransactions(accessToken, startDate, endDate) {
    if (!this.configured) {
      throw new Error('Plaid not configured');
    }

    try {
      const response = await this.plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count: 500,
          offset: 0,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting transactions:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get institution details
   * @param {string} institutionId - Institution ID
   * @returns {Promise<object>} Institution data
   */
  async getInstitution(institutionId) {
    if (!this.configured) {
      throw new Error('Plaid not configured');
    }

    try {
      const response = await this.plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US'],
      });
      return response.data.institution;
    } catch (error) {
      console.error('Error getting institution:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Remove an item (disconnect account)
   * @param {string} accessToken - Access token
   * @returns {Promise<object>} Response
   */
  async removeItem(accessToken) {
    if (!this.configured) {
      throw new Error('Plaid not configured');
    }

    try {
      const response = await this.plaidClient.itemRemove({
        access_token: accessToken,
      });
      return response.data;
    } catch (error) {
      console.error('Error removing item:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Detect recurring transactions (subscription patterns)
   * @param {Array} transactions - Array of transactions
   * @returns {Array} Detected recurring patterns
   */
  detectRecurringTransactions(transactions) {
    // Group transactions by merchant name
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

    // Analyze patterns
    const recurringPatterns = [];

    Object.entries(merchantGroups).forEach(([merchant, txns]) => {
      // Need at least 2 transactions to detect pattern
      if (txns.length < 2) return;

      // Sort by date
      txns.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Check for consistent amounts
      const amounts = txns.map(t => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const amountVariance = amounts.every(amt => Math.abs(amt - avgAmount) < avgAmount * 0.1);

      // Check for regular intervals
      if (txns.length >= 2) {
        const intervals = [];
        for (let i = 1; i < txns.length; i++) {
          const days = Math.round(
            (new Date(txns[i].date) - new Date(txns[i - 1].date)) / (1000 * 60 * 60 * 24)
          );
          intervals.push(days);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        // Determine billing cycle
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

        // Only include if confidence is reasonable
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

    // Sort by confidence
    return recurringPatterns.sort((a, b) => b.confidence - a.confidence);
  }
}

export default new PlaidService();
