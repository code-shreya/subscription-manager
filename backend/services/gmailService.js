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

  // Search for subscription-related emails
  async searchSubscriptionEmails(maxResults = 50, daysBack = 90) {
    try {
      const gmail = this.getGmailClient();

      // Calculate date for query (90 days back)
      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      const dateString = date.toISOString().split('T')[0].replace(/-/g, '/');

      // Search query for subscription-related emails (PRIORITIZE confirmation emails)
      const query = `after:${dateString} (
        subject:(
          "subscription successful" OR "subscription started" OR "subscription confirmed" OR
          "welcome to your subscription" OR "subscription activated" OR
          subscription OR renewal OR billing OR invoice OR payment OR receipt OR
          "next billing" OR "cancel anytime" OR "manage subscription"
        )
        OR from:(noreply OR billing OR subscriptions OR welcome)
      )`;

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults,
      });

      const messages = response.data.messages || [];
      console.log(`📧 Found ${messages.length} potential subscription emails`);

      return messages;
    } catch (error) {
      console.error('Error searching emails:', error.message);
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

  // Scan emails and return detailed content
  async scanEmails(maxResults = 20, daysBack = 90) {
    try {
      const messages = await this.searchSubscriptionEmails(maxResults, daysBack);

      const emailDetails = [];
      for (const message of messages.slice(0, maxResults)) {
        const details = await this.getEmailDetails(message.id);
        if (details) {
          emailDetails.push(details);
        }
      }

      console.log(`📬 Retrieved ${emailDetails.length} email details`);
      return emailDetails;
    } catch (error) {
      console.error('Error scanning emails:', error.message);
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
