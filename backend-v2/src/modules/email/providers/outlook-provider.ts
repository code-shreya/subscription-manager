import {
  EmailProvider,
  EmailMessage,
  EmailSearchResult,
  EmailScanProgress,
  OAuthTokens,
} from './email-provider.interface';

/**
 * Outlook Provider
 * Implements email provider interface for Outlook/Microsoft 365 using Microsoft Graph API
 */
export class OutlookProvider extends EmailProvider {
  providerName: 'outlook' = 'outlook';
  private credentials: OAuthTokens | null = null;
  private clientId: string = '';
  private clientSecret: string = '';
  private redirectUri: string = '';

  private readonly SCOPES = ['Mail.Read', 'User.Read', 'offline_access'];
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
  private readonly AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  private readonly TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  /**
   * Initialize OAuth client with credentials
   */
  initialize(credentials: { clientId: string; clientSecret: string; redirectUri: string }): void {
    const { clientId, clientSecret, redirectUri } = credentials;

    if (!clientId || !clientSecret) {
      throw new Error('Outlook API credentials not configured');
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(): string {
    if (!this.clientId) {
      throw new Error('Outlook OAuth client not initialized. Call initialize() first.');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.SCOPES.join(' '),
      response_mode: 'query',
      prompt: 'consent',
    });

    return `${this.AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async getTokenFromCode(code: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Failed to get Outlook tokens: ${error.error_description || error.error}`);
    }

    const data = await response.json() as any;

    const tokens: OAuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };

    this.setCredentials(tokens);
    return tokens;
  }

  /**
   * Set credentials from saved tokens
   */
  setCredentials(tokens: OAuthTokens): void {
    this.credentials = tokens;
  }

  /**
   * Check if provider is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.credentials?.access_token;
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.credentials?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.credentials.refresh_token,
      grant_type: 'refresh_token',
    });

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Failed to refresh Outlook token: ${error.error_description || error.error}`);
    }

    const data = await response.json() as any;

    const tokens: OAuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.credentials.refresh_token,
      expiry_date: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };

    this.setCredentials(tokens);
    return tokens;
  }

  /**
   * Make authenticated Graph API request
   */
  private async graphRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isAuthenticated()) {
      throw new Error('Outlook not authenticated');
    }

    // Check if token is expired and refresh if needed
    if (this.credentials?.expiry_date && Date.now() >= this.credentials.expiry_date) {
      await this.refreshAccessToken();
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.GRAPH_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
      throw new Error(`Graph API error: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Search for subscription-related emails
   */
  async searchSubscriptionEmails(
    maxResults: number,
    daysBack: number,
    pageToken?: string | null
  ): Promise<EmailSearchResult> {
    // Calculate date for query
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString();

    // Build OData filter query
    const filter = `receivedDateTime ge ${dateString}`;
    const search = `subject:(subscription OR renewal OR billing OR invoice OR payment OR receipt OR membership OR premium) OR from:(noreply OR billing OR subscriptions OR welcome OR payments OR netflix OR spotify OR amazon OR microsoft)`;

    const params = new URLSearchParams({
      $filter: filter,
      $search: `"${search}"`,
      $top: Math.min(maxResults, 999).toString(), // Graph API limit
      $select: 'id',
      $orderby: 'receivedDateTime DESC',
    });

    if (pageToken) {
      params.append('$skiptoken', pageToken);
    }

    const endpoint = `/me/messages?${params.toString()}`;

    const response = await this.graphRequest<{
      value: Array<{ id: string }>;
      '@odata.nextLink'?: string;
    }>(endpoint);

    // Extract skip token from next link if present
    let nextPageToken: string | undefined;
    if (response['@odata.nextLink']) {
      const url = new URL(response['@odata.nextLink']);
      nextPageToken = url.searchParams.get('$skiptoken') || undefined;
    }

    return {
      messages: response.value.map((msg) => ({ id: msg.id })),
      nextPageToken,
      totalFound: response.value.length,
    };
  }

  /**
   * Get full email details including body
   */
  async getEmailDetails(messageId: string): Promise<EmailMessage | null> {
    try {
      const response = await this.graphRequest<{
        id: string;
        subject: string;
        from: { emailAddress: { address: string; name: string } };
        receivedDateTime: string;
        body: { contentType: string; content: string };
      }>(`/me/messages/${messageId}`);

      // Clean HTML if body is HTML
      let body = response.body.content;
      if (response.body.contentType === 'html') {
        body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }

      return {
        id: response.id,
        subject: response.subject,
        from: `${response.from.emailAddress.name} <${response.from.emailAddress.address}>`,
        date: response.receivedDateTime,
        body: body.substring(0, 5000), // Limit body length for AI processing
      };
    } catch (error) {
      console.error(`Error getting email ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Scan emails and return detailed content
   */
  async scanEmails(
    maxResults: number,
    daysBack: number,
    progressCallback?: (progress: EmailScanProgress) => void
  ): Promise<EmailMessage[]> {
    const result = await this.searchSubscriptionEmails(maxResults, daysBack);
    const messages = result.messages || [];

    const emailDetails: EmailMessage[] = [];
    const total = Math.min(messages.length, maxResults);

    for (let i = 0; i < total; i++) {
      const message = messages[i];
      const details = await this.getEmailDetails(message.id);

      if (details) {
        emailDetails.push(details);
      }

      if (progressCallback) {
        progressCallback({
          phase: 'fetching',
          current: i + 1,
          total: total,
          percentage: Math.round(((i + 1) / total) * 100),
        });
      }

      // Rate limiting (Graph API allows higher rate)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return emailDetails;
  }

  /**
   * Deep scan through all emails (paginated)
   */
  async deepScan(
    daysBack: number,
    progressCallback?: (progress: EmailScanProgress) => void
  ): Promise<EmailMessage[]> {
    // Get all message IDs with pagination
    let allMessageIds: Array<{ id: string }> = [];
    let pageToken: string | undefined | null = null;
    let pageCount = 0;

    do {
      pageCount++;

      const result = await this.searchSubscriptionEmails(999, daysBack, pageToken);
      allMessageIds = allMessageIds.concat(result.messages);
      pageToken = result.nextPageToken;

      if (progressCallback) {
        progressCallback({
          phase: 'searching',
          current: allMessageIds.length,
          total: allMessageIds.length,
          percentage: 0,
          page: pageCount,
          hasMore: !!pageToken,
        });
      }

      // Rate limiting between pages
      if (pageToken) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } while (pageToken && allMessageIds.length < 200); // Limit to 200 for faster processing

    // Fetch email details in batches
    const emailDetails: EmailMessage[] = [];
    const batchSize = 50;
    const totalBatches = Math.ceil(allMessageIds.length / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, allMessageIds.length);
      const batchMessages = allMessageIds.slice(start, end);

      for (const message of batchMessages) {
        const details = await this.getEmailDetails(message.id);
        if (details) {
          emailDetails.push(details);
        }

        if (progressCallback) {
          progressCallback({
            phase: 'fetching',
            current: emailDetails.length,
            total: allMessageIds.length,
            percentage: Math.round((emailDetails.length / allMessageIds.length) * 100),
          });
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return emailDetails;
  }

  /**
   * Disconnect and revoke access
   */
  async disconnect(): Promise<void> {
    // Microsoft Graph doesn't have a simple revoke endpoint
    // User must manually revoke access at: https://account.live.com/consent/Manage
    this.credentials = null;
  }

  /**
   * Get user info from Microsoft Graph
   */
  async getUserInfo(): Promise<{ email: string; name?: string; profilePicture?: string }> {
    if (!this.isAuthenticated()) {
      throw new Error('Outlook not authenticated');
    }

    const response = await this.graphRequest<{
      mail: string;
      userPrincipalName: string;
      displayName: string;
    }>('/me');

    return {
      email: response.mail || response.userPrincipalName,
      name: response.displayName,
    };
  }
}
