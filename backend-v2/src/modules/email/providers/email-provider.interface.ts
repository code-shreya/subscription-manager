/**
 * Email Provider Interface
 * Abstract interface for different email providers (Gmail, Outlook, Yahoo, IMAP)
 */

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
}

export interface EmailSearchResult {
  messages: Array<{ id: string }>;
  nextPageToken?: string;
  totalFound: number;
}

export interface EmailScanProgress {
  phase: 'searching' | 'fetching' | 'analyzing';
  current: number;
  total: number;
  percentage: number;
  page?: number;
  hasMore?: boolean;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
}

/**
 * Abstract Email Provider
 * All email providers must implement this interface
 */
export abstract class EmailProvider {
  abstract providerName: 'gmail' | 'outlook' | 'yahoo' | 'imap';

  /**
   * Initialize OAuth client with credentials
   */
  abstract initialize(credentials: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): void;

  /**
   * Generate OAuth authorization URL
   */
  abstract getAuthUrl(): string;

  /**
   * Exchange authorization code for access tokens
   */
  abstract getTokenFromCode(code: string): Promise<OAuthTokens>;

  /**
   * Set credentials from saved tokens
   */
  abstract setCredentials(tokens: OAuthTokens): void;

  /**
   * Check if provider is authenticated
   */
  abstract isAuthenticated(): boolean;

  /**
   * Refresh access token if expired
   */
  abstract refreshAccessToken?(): Promise<OAuthTokens>;

  /**
   * Search for subscription-related emails
   * @param maxResults - Maximum number of results per page
   * @param daysBack - Number of days to search back
   * @param pageToken - Pagination token for next page
   */
  abstract searchSubscriptionEmails(
    maxResults: number,
    daysBack: number,
    pageToken?: string | null
  ): Promise<EmailSearchResult>;

  /**
   * Get full email details including body
   * @param messageId - Email message ID
   */
  abstract getEmailDetails(messageId: string): Promise<EmailMessage | null>;

  /**
   * Scan emails and return detailed content
   * @param maxResults - Maximum number of emails to scan
   * @param daysBack - Number of days to search back
   * @param progressCallback - Optional progress callback
   */
  abstract scanEmails(
    maxResults: number,
    daysBack: number,
    progressCallback?: (progress: EmailScanProgress) => void
  ): Promise<EmailMessage[]>;

  /**
   * Deep scan through all emails (paginated)
   * @param daysBack - Number of days to search back
   * @param progressCallback - Optional progress callback
   */
  abstract deepScan(
    daysBack: number,
    progressCallback?: (progress: EmailScanProgress) => void
  ): Promise<EmailMessage[]>;

  /**
   * Disconnect and revoke access
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get provider-specific metadata (e.g., user email address)
   */
  abstract getUserInfo?(): Promise<{
    email: string;
    name?: string;
    profilePicture?: string;
  }>;
}
