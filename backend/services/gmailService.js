import { google } from 'googleapis';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, '..', 'gmail-token.json');

class GmailService {
  constructor() {
    this.oauth2Client = null;
    this.isAuthenticated = false;
  }

  // Initialize OAuth2 client
  initializeOAuth() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/api/gmail/callback';

    if (!clientId || !clientSecret) {
      console.warn('Gmail API credentials not configured');
      return null;
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Load saved token if exists
    this.loadSavedToken();

    return this.oauth2Client;
  }

  // Load saved access token
  async loadSavedToken() {
    try {
      if (existsSync(TOKEN_PATH)) {
        const token = await fs.readFile(TOKEN_PATH, 'utf-8');
        const tokenData = JSON.parse(token);
        this.oauth2Client.setCredentials(tokenData);
        this.isAuthenticated = true;
        console.log('✅ Gmail token loaded successfully');
      }
    } catch (error) {
      console.error('Error loading Gmail token:', error.message);
    }
  }

  // Save access token
  async saveToken(tokens) {
    try {
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;
      console.log('✅ Gmail token saved successfully');
    } catch (error) {
      console.error('Error saving Gmail token:', error.message);
      throw error;
    }
  }

  // Generate authentication URL
  getAuthUrl() {
    if (!this.oauth2Client) {
      this.initializeOAuth();
    }

    if (!this.oauth2Client) {
      throw new Error('Gmail OAuth client not initialized');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  // Exchange authorization code for tokens
  async getTokenFromCode(code) {
    if (!this.oauth2Client) {
      this.initializeOAuth();
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    await this.saveToken(tokens);
    return tokens;
  }

  // Check if authenticated
  checkAuthentication() {
    return this.isAuthenticated && this.oauth2Client?.credentials?.access_token;
  }

  // Get Gmail client
  getGmailClient() {
    if (!this.checkAuthentication()) {
      throw new Error('Gmail not authenticated');
    }

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Search for subscription-related emails with pagination support
  async searchSubscriptionEmails(maxResults = 200, daysBack = 365, pageToken = null) {
    try {
      const gmail = this.getGmailClient();

      // Calculate date for query (365 days back for full year analysis)
      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      const dateString = date.toISOString().split('T')[0].replace(/-/g, '/');

      // Enhanced search query with more subscription patterns
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

      const requestParams = {
        userId: 'me',
        q: query,
        maxResults: Math.min(maxResults, 500), // Gmail API limit
      };

      if (pageToken) {
        requestParams.pageToken = pageToken;
      }

      const response = await gmail.users.messages.list(requestParams);

      const messages = response.data.messages || [];
      console.log(`📧 Found ${messages.length} potential subscription emails in this batch`);

      return {
        messages,
        nextPageToken: response.data.nextPageToken,
        totalFound: messages.length,
      };
    } catch (error) {
      console.error('Error searching emails:', error.message);
      throw error;
    }
  }

  // Deep scan: paginate through all results for 365-day analysis
  async deepScanAllEmails(daysBack = 365, progressCallback = null) {
    try {
      let allMessages = [];
      let pageToken = null;
      let pageCount = 0;

      do {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount}...`);

        const result = await this.searchSubscriptionEmails(500, daysBack, pageToken);
        allMessages = allMessages.concat(result.messages);
        pageToken = result.nextPageToken;

        if (progressCallback) {
          progressCallback({
            page: pageCount,
            totalSoFar: allMessages.length,
            hasMore: !!pageToken,
          });
        }

        // Rate limiting between pages
        if (pageToken) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } while (pageToken && allMessages.length < 1000); // Safety limit

      console.log(`📬 Total emails found across ${daysBack} days: ${allMessages.length}`);
      return allMessages;
    } catch (error) {
      console.error('Error in deep scan:', error.message);
      throw error;
    }
  }

  // Get email details
  async getEmailDetails(messageId) {
    try {
      const gmail = this.getGmailClient();

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload.headers;

      // Extract relevant headers
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      // Extract email body
      let body = '';
      if (message.payload.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } else if (message.payload.parts) {
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
      console.error(`Error getting email ${messageId}:`, error.message);
      return null;
    }
  }

  // Scan emails and return detailed content with progress tracking
  async scanEmails(maxResults = 20, daysBack = 90, progressCallback = null) {
    try {
      const result = await this.searchSubscriptionEmails(maxResults, daysBack);
      const messages = result.messages || [];

      const emailDetails = [];
      const total = Math.min(messages.length, maxResults);

      for (let i = 0; i < total; i++) {
        const message = messages[i];
        const details = await this.getEmailDetails(message.id);

        if (details) {
          emailDetails.push(details);
        }

        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: total,
            percentage: Math.round(((i + 1) / total) * 100),
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log(`📬 Retrieved ${emailDetails.length} email details`);
      return emailDetails;
    } catch (error) {
      console.error('Error scanning emails:', error.message);
      throw error;
    }
  }

  // Deep 365-day scan with full analysis
  async deepScan365Days(progressCallback = null) {
    try {
      console.log('🔍 Starting deep 365-day email scan...');

      // Get all messages from past year
      const messages = await this.deepScanAllEmails(365, (progress) => {
        if (progressCallback) {
          progressCallback({
            phase: 'searching',
            ...progress,
          });
        }
      });

      console.log(`📧 Retrieving details for ${messages.length} emails...`);

      // Fetch email details in batches
      const emailDetails = [];
      const batchSize = 50;
      const totalBatches = Math.ceil(messages.length / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, messages.length);
        const batchMessages = messages.slice(start, end);

        console.log(`📦 Processing batch ${batch + 1}/${totalBatches} (${start}-${end})...`);

        for (const message of batchMessages) {
          const details = await this.getEmailDetails(message.id);
          if (details) {
            emailDetails.push(details);
          }

          if (progressCallback) {
            progressCallback({
              phase: 'fetching',
              current: emailDetails.length,
              total: messages.length,
              percentage: Math.round((emailDetails.length / messages.length) * 100),
            });
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`✅ Deep scan complete: ${emailDetails.length} emails retrieved`);
      return emailDetails;
    } catch (error) {
      console.error('Error in deep 365-day scan:', error.message);
      throw error;
    }
  }

  // Disconnect Gmail
  async disconnect() {
    try {
      if (existsSync(TOKEN_PATH)) {
        await fs.unlink(TOKEN_PATH);
      }
      this.oauth2Client = null;
      this.isAuthenticated = false;
      console.log('✅ Gmail disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Gmail:', error.message);
      throw error;
    }
  }
}

export default new GmailService();
