const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
  // Get all subscriptions
  async getSubscriptions() {
    const response = await fetch(`${API_BASE_URL}/subscriptions`);
    if (!response.ok) throw new Error('Failed to fetch subscriptions');
    return response.json();
  },

  // Get single subscription
  async getSubscription(id) {
    const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`);
    if (!response.ok) throw new Error('Failed to fetch subscription');
    return response.json();
  },

  // Create subscription
  async createSubscription(data) {
    const response = await fetch(`${API_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create subscription');
    return response.json();
  },

  // Update subscription
  async updateSubscription(id, data) {
    const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update subscription');
    return response.json();
  },

  // Delete subscription
  async deleteSubscription(id) {
    const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete subscription');
    return response.json();
  },

  // Get analytics
  async getAnalytics() {
    const response = await fetch(`${API_BASE_URL}/analytics`);
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  },

  // ============ PLAID / BANK INTEGRATION ============

  // Check if Plaid is configured
  async getPlaidStatus() {
    const response = await fetch(`${API_BASE_URL}/plaid/status`);
    if (!response.ok) throw new Error('Failed to check Plaid status');
    return response.json();
  },

  // Create link token
  async createLinkToken() {
    const response = await fetch(`${API_BASE_URL}/plaid/create-link-token`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to create link token');
    return response.json();
  },

  // Exchange public token (mock mode: pass bankId)
  async exchangePublicToken(publicToken, metadata) {
    const response = await fetch(`${API_BASE_URL}/plaid/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_token: publicToken,
        metadata,
        bankId: metadata?.bankId // For mock Indian banks
      }),
    });
    if (!response.ok) throw new Error('Failed to exchange token');
    return response.json();
  },

  // Get connected accounts
  async getConnectedAccounts() {
    const response = await fetch(`${API_BASE_URL}/plaid/accounts`);
    if (!response.ok) throw new Error('Failed to fetch connected accounts');
    return response.json();
  },

  // Sync transactions
  async syncAccount(accountId) {
    const response = await fetch(`${API_BASE_URL}/plaid/sync/${accountId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to sync account');
    return response.json();
  },

  // Get transactions
  async getTransactions() {
    const response = await fetch(`${API_BASE_URL}/plaid/transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  // Get detected subscriptions from bank
  async getDetectedFromBank() {
    const response = await fetch(`${API_BASE_URL}/plaid/detected-subscriptions`);
    if (!response.ok) throw new Error('Failed to fetch detected subscriptions');
    return response.json();
  },

  // Import detected subscription
  async importFromBank(detectedId) {
    const response = await fetch(`${API_BASE_URL}/plaid/import/${detectedId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to import subscription');
    return response.json();
  },

  // Dismiss detected subscription
  async dismissDetectedBank(detectedId) {
    const response = await fetch(`${API_BASE_URL}/plaid/detected/${detectedId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to dismiss detected subscription');
    return response.json();
  },

  // Remove connected account
  async removeConnectedAccount(accountId) {
    const response = await fetch(`${API_BASE_URL}/plaid/accounts/${accountId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove account');
    return response.json();
  },
};
