const TOKEN_KEYS = {
  access: 'submanager_access_token',
  refresh: 'submanager_refresh_token',
};

async function fetchWithAuth(url, options = {}) {
  const accessToken = localStorage.getItem(TOKEN_KEYS.access);

  const headers = {
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  let response = await fetch(url, { ...options, headers });

  // If 401, try refreshing the token
  if (response.status === 401) {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
    if (refreshToken) {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const tokens = refreshData.tokens || refreshData;
        localStorage.setItem(TOKEN_KEYS.access, tokens.accessToken);
        localStorage.setItem(TOKEN_KEYS.refresh, tokens.refreshToken);

        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        // Refresh failed — force logout
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.refresh);
        window.dispatchEvent(new CustomEvent('auth-expired'));
        throw new Error('Session expired. Please log in again.');
      }
    }
  }

  return response;
}

async function request(url, options = {}) {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.message || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export const api = {
  // ============ SUBSCRIPTIONS ============

  async getSubscriptions() {
    return request('/api/subscriptions');
  },

  async getSubscription(id) {
    return request(`/api/subscriptions/${id}`);
  },

  async createSubscription(data) {
    const payload = {
      ...data,
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    };
    // Ensure ISO date format
    if (payload.next_billing_date && !payload.next_billing_date.includes('T')) {
      payload.next_billing_date = `${payload.next_billing_date}T00:00:00.000Z`;
    }
    return request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSubscription(id, data) {
    const payload = {
      ...data,
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    };
    if (payload.next_billing_date && !payload.next_billing_date.includes('T')) {
      payload.next_billing_date = `${payload.next_billing_date}T00:00:00.000Z`;
    }
    return request(`/api/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteSubscription(id) {
    return request(`/api/subscriptions/${id}`, { method: 'DELETE' });
  },

  // ============ ANALYTICS ============

  async getAnalytics() {
    return request('/api/analytics/overview');
  },

  // ============ BANK INTEGRATION ============

  async getSupportedBanks() {
    return request('/api/banks/supported');
  },

  async getBankConnections() {
    return request('/api/banks/connections');
  },

  async connectBank(bankId) {
    return request('/api/banks/connect', {
      method: 'POST',
      body: JSON.stringify({ bankId }),
    });
  },

  async syncBankConnection(connectionId) {
    return request(`/api/banks/connections/${connectionId}/sync`, {
      method: 'POST',
    });
  },

  async disconnectBank(connectionId) {
    return request(`/api/banks/connections/${connectionId}`, {
      method: 'DELETE',
    });
  },

  async getBankRecurring(connectionId) {
    return request(`/api/banks/connections/${connectionId}/recurring`);
  },

  // ============ DETECTION ============

  async getDetectionResults(status) {
    const query = status ? `?status=${status}` : '';
    return request(`/api/detection/results${query}`);
  },

  async importDetection(id) {
    return request(`/api/detection/${id}/import`, { method: 'POST' });
  },

  async rejectDetection(id) {
    return request(`/api/detection/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    });
  },

  // ============ EMAIL / GMAIL ============

  async getEmailConnections() {
    return request('/api/email/connections');
  },

  async getGmailAuthUrl() {
    return request('/api/email/gmail/auth-url');
  },

  async handleGmailCallback(code) {
    return request('/api/email/gmail/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async scanEmails(connectionId, options = {}) {
    return request(`/api/email/connections/${connectionId}/scan`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async startEmailDetectionScan() {
    return request('/api/detection/scan/email', { method: 'POST' });
  },

  async getEmailScanJob(jobId) {
    return request(`/api/detection/jobs/email-scan/${jobId}`);
  },

  // ============ NOTIFICATIONS ============

  async getNotifications(limit = 20) {
    return request(`/api/notifications?limit=${limit}`);
  },

  async markNotificationRead(id) {
    return request(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead() {
    return request('/api/notifications/read-all', { method: 'PATCH' });
  },

  // ============ PROFILE ============

  async getProfile() {
    return request('/api/auth/me');
  },

  async updateProfile(data) {
    return request('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
