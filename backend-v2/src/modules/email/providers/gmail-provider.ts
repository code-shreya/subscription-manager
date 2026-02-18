import { google } from 'googleapis';
import {
  EmailProvider,
  EmailMessage,
  EmailSearchResult,
  EmailScanProgress,
  OAuthTokens,
} from './email-provider.interface';

/**
 * Gmail Provider
 * Implements email provider interface for Gmail using Google APIs
 */
export class GmailProvider extends EmailProvider {
  providerName: 'gmail' = 'gmail';
  private oauth2Client: any = null;
  private _isAuthenticated: boolean = false;

  private readonly SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

  /**
   * Initialize OAuth client with credentials
   */
  initialize(credentials: { clientId: string; clientSecret: string; redirectUri: string }): void {
    const { clientId, clientSecret, redirectUri } = credentials;

    if (!clientId || !clientSecret) {
      throw new Error('Gmail API credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('Gmail OAuth client not initialized. Call initialize() first.');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for access tokens
   */
  async getTokenFromCode(code: string): Promise<OAuthTokens> {
    if (!this.oauth2Client) {
      throw new Error('Gmail OAuth client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.setCredentials(tokens);

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
    };
  }

  /**
   * Set credentials from saved tokens
   */
  setCredentials(tokens: OAuthTokens): void {
    if (!this.oauth2Client) {
      throw new Error('Gmail OAuth client not initialized');
    }

    this.oauth2Client.setCredentials(tokens);
    this._isAuthenticated = true;
  }

  /**
   * Check if provider is authenticated
   */
  isAuthenticated(): boolean {
    return this._isAuthenticated && !!this.oauth2Client?.credentials?.access_token;
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.oauth2Client) {
      throw new Error('Gmail OAuth client not initialized');
    }

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.setCredentials(credentials);

    return {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
      scope: credentials.scope,
    };
  }

  /**
   * Get Gmail client
   */
  private getGmailClient() {
    if (!this.isAuthenticated()) {
      throw new Error('Gmail not authenticated');
    }

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Search for subscription-related emails
   */
  async searchSubscriptionEmails(
    maxResults: number,
    daysBack: number,
    pageToken?: string | null
  ): Promise<EmailSearchResult> {
    const gmail = this.getGmailClient();

    // Calculate date for query
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString().split('T')[0].replace(/-/g, '/');

    // Enhanced search query with subscription patterns
    const query = `after:${dateString} (
      subject:(
        "subscription successful" OR "subscription started" OR "subscription confirmed" OR
        "welcome to your subscription" OR "subscription activated" OR
        subscription OR renewal OR billing OR invoice OR payment OR receipt OR
        "next billing" OR "cancel anytime" OR "manage subscription" OR
        "your plan" OR "membership" OR "auto-renewal" OR "recurring" OR
        "billed monthly" OR "billed annually" OR "subscription fee" OR
        "premium" OR "pro plan" OR "paid plan"
      )
      OR from:(
        noreply OR billing OR subscriptions OR welcome OR payments OR
        netflix OR spotify OR amazon OR google OR apple OR microsoft OR
        hotstar OR zomato OR swiggy OR zerodha OR groww
      )
    )`;

    const requestParams: any = {
      userId: 'me',
      q: query,
      maxResults: Math.min(maxResults, 500), // Gmail API limit
    };

    if (pageToken) {
      requestParams.pageToken = pageToken;
    }

    const response = await gmail.users.messages.list(requestParams);

    const messages = response.data.messages || [];

    return {
      messages: messages.map((msg) => ({ id: msg.id! })),
      nextPageToken: response.data.nextPageToken || undefined,
      totalFound: messages.length,
    };
  }

  /**
   * Get full email details including body
   */
  async getEmailDetails(messageId: string): Promise<EmailMessage | null> {
    try {
      const gmail = this.getGmailClient();

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];

      // Extract relevant headers
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      // Extract email body
      let body = '';
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } else if (message.payload?.parts) {
        const textPart = message.payload.parts.find(
          (part) => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      }

      // Clean HTML if needed (basic cleanup)
      body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      return {
        id: messageId,
        subject,
        from,
        date,
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

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
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

      const result = await this.searchSubscriptionEmails(500, daysBack, pageToken);
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return emailDetails;
  }

  /**
   * Disconnect and revoke access
   */
  async disconnect(): Promise<void> {
    if (this.oauth2Client?.credentials?.access_token) {
      try {
        await this.oauth2Client.revokeCredentials();
      } catch (error) {
        console.error('Error revoking Gmail credentials:', error);
      }
    }

    this.oauth2Client = null;
    this._isAuthenticated = false;
  }

  /**
   * Get user info from Gmail
   */
  async getUserInfo(): Promise<{ email: string; name?: string; profilePicture?: string }> {
    if (!this.isAuthenticated()) {
      throw new Error('Gmail not authenticated');
    }

    const gmail = this.getGmailClient();
    const response = await gmail.users.getProfile({ userId: 'me' });

    return {
      email: response.data.emailAddress || '',
    };
  }
}
