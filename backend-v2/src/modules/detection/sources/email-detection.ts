import OpenAI from 'openai';
import { gmail_v1, google } from 'googleapis';
import { appConfig } from '../../../config';
import { AIDetectionResult } from '../../../shared/schemas/detection.schema';

/**
 * Email Detection Service
 * Handles Gmail integration and AI-powered email parsing
 * CRITICAL: Preserves exact OpenAI prompt from original implementation
 */
export class EmailDetectionService {
  private openai: OpenAI | null = null;

  constructor() {
    if (appConfig.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: appConfig.openai.apiKey,
      });
    }
  }

  /**
   * Get Gmail client from OAuth tokens
   */
  private getGmailClient(accessToken: string, refreshToken: string): gmail_v1.Gmail {
    const oauth2Client = new google.auth.OAuth2(
      appConfig.gmail.clientId,
      appConfig.gmail.clientSecret,
      appConfig.gmail.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Search for subscription emails using Gmail API
   * Preserves exact search query from original implementation
   */
  async searchSubscriptionEmails(
    accessToken: string,
    refreshToken: string,
    options: {
      maxResults?: number;
      daysBack?: number;
      pageToken?: string | null;
    } = {}
  ): Promise<{ messages: any[]; nextPageToken?: string | null }> {
    const { maxResults = 200, daysBack = 365, pageToken = null } = options;

    const gmail = this.getGmailClient(accessToken, refreshToken);

    // Calculate date for query
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString().split('T')[0].replace(/-/g, '/');

    // Enhanced search query with subscription patterns (preserved from original)
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

    if (pageToken !== null) {
      requestParams.pageToken = pageToken;
    }

    const response = await gmail.users.messages.list(requestParams);

    return {
      messages: response.data.messages || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Deep scan: paginate through all results
   */
  async deepScanAllEmails(
    accessToken: string,
    refreshToken: string,
    daysBack: number = 365,
    progressCallback?: (progress: any) => void
  ): Promise<any[]> {
    let allMessages: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;

    do {
      pageCount++;

      const result = await this.searchSubscriptionEmails(accessToken, refreshToken, {
        maxResults: 500,
        daysBack,
        pageToken,
      });

      allMessages = allMessages.concat(result.messages);
      pageToken = result.nextPageToken ?? null;

      if (progressCallback) {
        progressCallback({
          page: pageCount,
          totalSoFar: allMessages.length,
          hasMore: !!pageToken,
        });
      }

      // Rate limiting between pages
      if (pageToken) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } while (pageToken && allMessages.length < 200); // Limit to 200 for faster processing

    return allMessages;
  }

  /**
   * Get email message details
   */
  async getEmailDetails(
    accessToken: string,
    refreshToken: string,
    messageId: string
  ): Promise<{ subject: string; from: string; date: string; body: string }> {
    const gmail = this.getGmailClient(accessToken, refreshToken);

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = message.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const date = headers.find((h) => h.name === 'Date')?.value || '';

    // Extract body
    let body = '';
    const parts = message.data.payload?.parts || [];

    const extractText = (part: any): string => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        // Simple HTML stripping
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      if (part.parts) {
        return part.parts.map(extractText).join(' ');
      }
      return '';
    };

    if (parts.length > 0) {
      body = parts.map(extractText).join(' ');
    } else if (message.data.payload?.body?.data) {
      body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
    }

    return { subject, from, date, body };
  }

  /**
   * Analyze email with OpenAI
   * CRITICAL: Preserves exact prompt from original implementation (lines 29-121 of aiService.js)
   */
  async analyzeEmailWithAI(email: {
    subject: string;
    from: string;
    date: string;
    body: string;
  }): Promise<AIDetectionResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const { subject, from, date, body } = email;

    // EXACT prompt from original aiService.js (lines 29-121) - DO NOT MODIFY
    const prompt = `Analyze this email and extract subscription information. PRIORITIZE emails that contain phrases like:
- "subscription successful" or "subscription started"
- "welcome to your subscription"
- "your subscription is now active"
- "next billing will be on" or "next payment date"
- "cancel anytime" or "manage subscription"
- "subscription confirmed"
- "renewal date"

These are HIGH PRIORITY subscription confirmation emails.

Email Details:
- Subject: ${subject}
- From: ${from}
- Date: ${date}
- Body: ${body.substring(0, 4000)}

Extract and return a JSON object with these fields:
{
  "isSubscription": true/false,
  "isConfirmationEmail": true/false (true if email contains confirmation phrases above),
  "emailType": "confirmed_subscription" | "one_time_payment" | "failed_payment" | "other",
  "serviceName": "name of the service (e.g., Netflix, Spotify)",
  "amount": numeric amount (e.g., 15.99, or null if not found),
  "currency": "currency code (e.g., USD, INR, EUR) or null",
  "billingCycle": "monthly" or "yearly" or "one-time",
  "nextBillingDate": "YYYY-MM-DD format (look for explicit dates in the email)",
  "category": "one of: Streaming, Music, Productivity, Cloud Storage, Gaming, News & Media, Fitness, Software, Investment, Rentals, Other",
  "confidence": 0-100 (how confident you are this is a subscription),
  "description": "brief description of what was detected",
  "foundKeywords": ["list of confirmation keywords found in email"]
}

Email Type Guidelines:
- "confirmed_subscription": Confirmation of recurring subscription, welcome emails, active subscriptions
- "one_time_payment": One-time purchases, single receipts, non-recurring charges
- "failed_payment": Payment failures, unsuccessful charges, payment method issues
- "other": General notifications, promotional emails, account updates

AMOUNT EXTRACTION - CRITICAL (READ ENTIRE EMAIL BODY):
Search the ENTIRE email for amounts in these patterns:
- "₹650/month" → amount: 650, currency: "INR", billingCycle: "monthly"
- "INR 650.00" OR "Rs. 650" OR "₹650" → amount: 650, currency: "INR"
- "$9.99 per month" → amount: 9.99, currency: "USD", billingCycle: "monthly"
- "Amount: ₹500" OR "Total: ₹500" OR "Payment: ₹500" → amount: 500
- "₹1,234.56" OR "₹1,234" → amount: 1234.56 or 1234, parse commas correctly
- "You paid ₹888" OR "Charged ₹888" OR "Billed ₹888" → amount: 888

Where to look (check ALL these locations):
1. Email subject line (highest priority for price)
2. First 500 characters of body (payment summaries)
3. HTML tables with <td> tags containing amounts
4. Sections with headers like "Payment Details", "Invoice", "Receipt", "Transaction"
5. Lines containing keywords: "charged", "billed", "payment", "total", "amount", "price", "paid", "debited"
6. Near subscription name or plan name
7. Footer or signature (sometimes has pricing)

Important rules:
- Parse comma-separated numbers: "1,234" = 1234 (NOT 1.234)
- If you see multiple amounts, choose the subscription/recurring amount (NOT setup fees, NOT discounts)
- Look for the LARGEST amount that appears with subscription/plan/membership context
- Check decimal places: ₹650.50 has decimals, ₹650 does not
- **NEVER return null if you find ANY number with currency symbol near subscription keywords**

CURRENCY DETECTION:
- ₹ or Rs or INR → "INR"
- $ or USD → "USD"
- € or EUR → "EUR"
- £ or GBP → "GBP"

BILLING CYCLE DETECTION:
- Look for: "per month", "/month", "monthly", "every month" → "monthly"
- Look for: "per year", "/year", "yearly", "annually", "every year" → "yearly"
- If no cycle mentioned but it's a subscription confirmation → default to "monthly"

CATEGORY DETECTION - IMPORTANT:
- "Investment": Groww, Zerodha, Upstox, mutual funds, SIP, stocks, trading platforms, investment apps
- "Rentals": Furlenco, RentoMojo, furniture rental, equipment rental, vehicle rental, lease
- "Streaming": Netflix, Prime Video, Disney+, Hotstar, YouTube Premium, streaming services
- "Music": Spotify, Apple Music, Amazon Music, Gaana, JioSaavn
- "Productivity": Notion, Evernote, Microsoft 365, Google Workspace, Slack
- "Software": Adobe, GitHub, development tools, SaaS products
- "Fitness": gym memberships, fitness apps, health subscriptions
- Choose the MOST SPECIFIC category that matches the service

Important:
- Only return valid JSON, no extra text
- If not a subscription email, return: {"isSubscription": false}
- Give HIGHER confidence (90-100) to emails with confirmation keywords
- Give priority to confirmation emails over payment receipts or failed payment notices
- Look for explicit billing dates in phrases like "next billing on March 15" or "renews on 15/03/2026"
- **CRITICAL**: Extract amount even if not in subject - check the ENTIRE email body, HTML tables, and footer
- If amount is not found but it's clearly a subscription confirmation, still extract it with amount: null`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a subscription detection expert. Extract subscription information from emails.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return { isSubscription: false };
      }

      const result = JSON.parse(content);
      return result as AIDetectionResult;
    } catch (error) {
      console.error('Error analyzing email with AI:', error);
      return { isSubscription: false };
    }
  }
}

// Export singleton instance
export const emailDetectionService = new EmailDetectionService();
