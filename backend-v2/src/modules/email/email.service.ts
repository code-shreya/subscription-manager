import { db } from '../../config/database';
import { ConnectedAccount } from '../../db/types';
import { EmailProvider, EmailMessage, EmailScanProgress, OAuthTokens } from './providers/email-provider.interface';
import { GmailProvider } from './providers/gmail-provider';
import { OutlookProvider } from './providers/outlook-provider';

/**
 * Email Service
 * Manages email connections and email scanning using provider abstraction
 */
export class EmailService {
  private providers: Map<string, EmailProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize email providers with credentials from environment
   */
  private initializeProviders(): void {
    // Initialize Gmail provider
    try {
      const gmailProvider = new GmailProvider();
      gmailProvider.initialize({
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/email/gmail/callback',
      });
      this.providers.set('gmail', gmailProvider);
    } catch (error) {
      console.warn('Gmail provider not configured:', error);
    }

    // Initialize Outlook provider
    try {
      const outlookProvider = new OutlookProvider();
      outlookProvider.initialize({
        clientId: process.env.OUTLOOK_CLIENT_ID || '',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/email/outlook/callback',
      });
      this.providers.set('outlook', outlookProvider);
    } catch (error) {
      console.warn('Outlook provider not configured:', error);
    }
  }

  /**
   * Get email provider by type
   */
  private getProvider(providerType: 'gmail' | 'outlook'): EmailProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Email provider '${providerType}' not configured`);
    }
    return provider;
  }

  /**
   * Get list of available email providers
   */
  getAvailableProviders(): Array<{ name: string; displayName: string; configured: boolean }> {
    return [
      {
        name: 'gmail',
        displayName: 'Gmail',
        configured: this.providers.has('gmail'),
      },
      {
        name: 'outlook',
        displayName: 'Outlook / Microsoft 365',
        configured: this.providers.has('outlook'),
      },
    ];
  }

  /**
   * Get OAuth authorization URL for a provider
   */
  getAuthUrl(providerType: 'gmail' | 'outlook'): string {
    const provider = this.getProvider(providerType);
    return provider.getAuthUrl();
  }

  /**
   * Handle OAuth callback and connect email account
   */
  async connectEmail(
    userId: string,
    providerType: 'gmail' | 'outlook',
    code: string
  ): Promise<{
    accountId: string;
    email: string;
    provider: string;
  }> {
    const provider = this.getProvider(providerType);

    // Exchange code for tokens
    const tokens = await provider.getTokenFromCode(code);

    // Get user info
    const userInfo = await provider.getUserInfo!();

    // Check if already connected
    const existingAccount = await db.query<ConnectedAccount>(
      `SELECT id FROM connected_accounts
       WHERE user_id = $1 AND account_type = $2 AND account_identifier = $3 AND status = 'active'
       LIMIT 1`,
      [userId, providerType, userInfo.email]
    );

    if (existingAccount.rows.length > 0) {
      // Update tokens for existing account
      await db.query(
        `UPDATE connected_accounts
         SET access_token_encrypted = $1,
             refresh_token_encrypted = $2,
             token_expires_at = $3,
             status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          tokens.access_token, // TODO: Encrypt in production
          tokens.refresh_token,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          existingAccount.rows[0].id,
        ]
      );

      return {
        accountId: existingAccount.rows[0].id,
        email: userInfo.email,
        provider: providerType,
      };
    }

    // Create new connected account
    const result = await db.query<ConnectedAccount>(
      `INSERT INTO connected_accounts (
        user_id, account_type, account_identifier, display_name,
        access_token_encrypted, refresh_token_encrypted, token_expires_at,
        status, metadata, sync_frequency_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, 168)
      RETURNING *`,
      [
        userId,
        providerType,
        userInfo.email,
        userInfo.name || userInfo.email,
        tokens.access_token, // TODO: Encrypt in production
        tokens.refresh_token,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        JSON.stringify({
          providerType,
          email: userInfo.email,
          profilePicture: userInfo.profilePicture,
        }),
      ]
    );

    return {
      accountId: result.rows[0].id,
      email: userInfo.email,
      provider: providerType,
    };
  }

  /**
   * Get all email connections for a user
   */
  async getEmailConnections(userId: string): Promise<ConnectedAccount[]> {
    const result = await db.query<ConnectedAccount>(
      `SELECT id, user_id, account_type, account_identifier, display_name,
              status, last_synced_at, sync_frequency_hours, metadata,
              created_at, updated_at
       FROM connected_accounts
       WHERE user_id = $1 AND account_type IN ('gmail', 'outlook')
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
      `SELECT * FROM connected_accounts
       WHERE id = $1 AND user_id = $2 AND account_type IN ('gmail', 'outlook')`,
      [accountId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get provider instance with credentials loaded from database
   */
  private async getAuthenticatedProvider(
    userId: string,
    accountId: string
  ): Promise<EmailProvider> {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account) {
      throw new Error('Email account not found');
    }

    const providerType = account.account_type as 'gmail' | 'outlook';
    const provider = this.getProvider(providerType);

    // Load tokens from database
    const tokens: OAuthTokens = {
      access_token: account.access_token_encrypted || '',
      refresh_token: account.refresh_token_encrypted || undefined,
      expiry_date: account.token_expires_at?.getTime(),
    };

    provider.setCredentials(tokens);

    return provider;
  }

  /**
   * Scan emails for subscriptions
   */
  async scanEmails(
    userId: string,
    accountId: string,
    options: {
      maxResults?: number;
      daysBack?: number;
      deep?: boolean;
    } = {},
    progressCallback?: (progress: EmailScanProgress) => void
  ): Promise<EmailMessage[]> {
    const { maxResults = 50, daysBack = 90, deep = false } = options;

    const provider = await this.getAuthenticatedProvider(userId, accountId);

    let emails: EmailMessage[];

    if (deep) {
      emails = await provider.deepScan(daysBack, progressCallback);
    } else {
      emails = await provider.scanEmails(maxResults, daysBack, progressCallback);
    }

    // Update last synced time
    await db.query(
      `UPDATE connected_accounts
       SET last_synced_at = CURRENT_TIMESTAMP,
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{lastScanStats}',
             $2::jsonb
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        accountId,
        JSON.stringify({
          emailsScanned: emails.length,
          lastScanAt: new Date().toISOString(),
          daysBack,
          deep,
        }),
      ]
    );

    return emails;
  }

  /**
   * Disconnect email account
   */
  async disconnectEmail(userId: string, accountId: string): Promise<void> {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account) {
      throw new Error('Email account not found');
    }

    try {
      const provider = await this.getAuthenticatedProvider(userId, accountId);
      await provider.disconnect();
    } catch (error) {
      console.error('Error disconnecting from provider:', error);
      // Continue with database update even if provider disconnect fails
    }

    // Update status in database
    await db.query(
      `UPDATE connected_accounts
       SET status = 'disconnected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );
  }

  /**
   * Check authentication status for an email account
   */
  async checkAuthStatus(userId: string, accountId: string): Promise<{
    isAuthenticated: boolean;
    email: string;
    provider: string;
    lastSynced?: Date;
  }> {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account) {
      throw new Error('Email account not found');
    }

    let isAuthenticated = false;
    try {
      const provider = await this.getAuthenticatedProvider(userId, accountId);
      isAuthenticated = provider.isAuthenticated();
    } catch (error) {
      console.error('Error checking auth status:', error);
    }

    return {
      isAuthenticated,
      email: account.account_identifier,
      provider: account.account_type,
      lastSynced: account.last_synced_at || undefined,
    };
  }

  /**
   * Refresh access token for an email account
   */
  async refreshAccessToken(userId: string, accountId: string): Promise<void> {
    const account = await this.getConnectedAccount(userId, accountId);

    if (!account) {
      throw new Error('Email account not found');
    }

    const provider = await this.getAuthenticatedProvider(userId, accountId);

    if (!provider.refreshAccessToken) {
      throw new Error('Provider does not support token refresh');
    }

    const newTokens = await provider.refreshAccessToken();

    // Update tokens in database
    await db.query(
      `UPDATE connected_accounts
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           token_expires_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        newTokens.access_token,
        newTokens.refresh_token,
        newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        accountId,
      ]
    );
  }
}

// Export singleton instance
export const emailService = new EmailService();
