import OpenAI from 'openai';

class AIService {
  constructor() {
    this.openai = null;
    this.initialize();
  }

  initialize() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not configured. AI parsing disabled.');
      return;
    }

    this.openai = new OpenAI({ apiKey });
    console.log('✅ OpenAI initialized');
  }

  // Extract subscription information from email
  async extractSubscriptionFromEmail(emailData) {
    if (!this.openai) {
      throw new Error('OpenAI not initialized. Please configure OPENAI_API_KEY');
    }

    const { subject, from, body, date } = emailData;

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
- Body: ${body.substring(0, 2000)}

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
  "category": "one of: Streaming, Music, Productivity, Cloud Storage, Gaming, News & Media, Fitness, Software, Other",
  "confidence": 0-100 (how confident you are this is a subscription),
  "description": "brief description of what was detected",
  "foundKeywords": ["list of confirmation keywords found in email"]
}

Email Type Guidelines:
- "confirmed_subscription": Confirmation of recurring subscription, welcome emails, active subscriptions
- "one_time_payment": One-time purchases, single receipts, non-recurring charges
- "failed_payment": Payment failures, unsuccessful charges, payment method issues
- "other": General notifications, promotional emails, account updates

AMOUNT EXTRACTION - CRITICAL:
Look for amounts in these formats:
- "₹650/month" → amount: 650, currency: "INR", billingCycle: "monthly"
- "INR 650.00" → amount: 650, currency: "INR"
- "$9.99 per month" → amount: 9.99, currency: "USD", billingCycle: "monthly"
- "Rs. 199" → amount: 199, currency: "INR"
- "₹1,234" → amount: 1234, currency: "INR"
- "Amount: ₹500" → amount: 500, currency: "INR"
- "Total: $15.99" → amount: 15.99, currency: "USD"
- "Payment of ₹888" → amount: 888, currency: "INR"
- In HTML tables look for <td> tags with amounts
- Check for "charged", "billed", "payment", "total", "amount" keywords near numbers
- Parse comma-separated numbers correctly (1,234 = 1234)
- If you see multiple amounts, choose the subscription/recurring amount (not setup fees)

CURRENCY DETECTION:
- ₹ or Rs or INR → "INR"
- $ or USD → "USD"
- € or EUR → "EUR"
- £ or GBP → "GBP"

BILLING CYCLE DETECTION:
- Look for: "per month", "/month", "monthly", "every month" → "monthly"
- Look for: "per year", "/year", "yearly", "annually", "every year" → "yearly"
- If no cycle mentioned but it's a subscription confirmation → default to "monthly"

Important:
- Only return valid JSON, no extra text
- If not a subscription email, return: {"isSubscription": false}
- Give HIGHER confidence (90-100) to emails with confirmation keywords
- Give priority to confirmation emails over payment receipts or failed payment notices
- Look for explicit billing dates in phrases like "next billing on March 15" or "renews on 15/03/2026"
- **CRITICAL**: Extract amount even if not in subject - check the ENTIRE email body, HTML tables, and footer
- If amount is not found but it's clearly a subscription confirmation, still extract it with amount: null`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in identifying and extracting subscription information from emails. You return only valid JSON responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);

      // Add email metadata
      if (result.isSubscription) {
        result.emailId = emailData.id;
        result.emailSubject = subject;
        result.emailFrom = from;
      }

      return result;
    } catch (error) {
      console.error('Error extracting subscription:', error.message);
      return { isSubscription: false, error: error.message };
    }
  }

  // Batch process multiple emails
  async processEmailBatch(emails) {
    console.log(`🤖 Processing ${emails.length} emails with AI...`);

    const results = [];
    const confirmationEmails = [];
    const otherEmails = [];
    let foundCount = 0;

    for (const email of emails) {
      try {
        const extraction = await this.extractSubscriptionFromEmail(email);

        if (extraction.isSubscription && extraction.confidence >= 60) {
          // Separate confirmation emails from other types
          if (extraction.isConfirmationEmail) {
            confirmationEmails.push(extraction);
            console.log(`✅ Found confirmation: ${extraction.serviceName} - ₹${extraction.amount || 'N/A'} (${extraction.foundKeywords?.join(', ')})`);
          } else {
            otherEmails.push(extraction);
            console.log(`✅ Found subscription: ${extraction.serviceName} - ₹${extraction.amount || 'N/A'}`);
          }
          foundCount++;
        }

        // Rate limiting - don't overwhelm the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error.message);
      }
    }

    // Prioritize confirmation emails first
    const sortedResults = [...confirmationEmails, ...otherEmails];

    console.log(`🎯 AI found ${foundCount} subscriptions (${confirmationEmails.length} confirmations) from ${emails.length} emails`);
    return sortedResults;
  }

  // Enhance existing subscription data
  async enhanceSubscriptionData(subscriptionName) {
    if (!this.openai) {
      return null;
    }

    const prompt = `For the subscription service "${subscriptionName}", provide additional information:

Return a JSON object with:
{
  "category": "best matching category: Streaming, Music, Productivity, Cloud Storage, Gaming, News & Media, Fitness, Software, Other",
  "commonPricing": "typical price range (e.g., '$9.99-14.99/month')",
  "description": "brief one-line description of the service",
  "cancellationDifficulty": "easy/medium/hard",
  "alternatives": ["list", "of", "alternatives"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a subscription service expert. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error enhancing subscription data:', error.message);
      return null;
    }
  }
}

export default new AIService();
