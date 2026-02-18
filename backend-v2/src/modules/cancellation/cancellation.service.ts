import { db } from '../../config/database';
import { CancellationGuide, CancellationRequest, CancellationMethod } from '../../db/types';
import OpenAI from 'openai';

/**
 * Cancellation Service
 * Manages cancellation guides and assists users in cancelling subscriptions
 */
export class CancellationService {
  private openai: OpenAI | null = null;

  constructor() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Get cancellation guide for a service
   */
  async getGuide(serviceName: string): Promise<CancellationGuide | null> {
    const result = await db.query<CancellationGuide>(
      `SELECT * FROM cancellation_guides
       WHERE LOWER(service_name) = LOWER($1)`,
      [serviceName]
    );

    return result.rows[0] || null;
  }

  /**
   * Search cancellation guides
   */
  async searchGuides(query?: string, category?: string): Promise<CancellationGuide[]> {
    let sql = 'SELECT * FROM cancellation_guides WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (query) {
      sql += ` AND LOWER(service_name) LIKE LOWER($${paramIndex++})`;
      params.push(`%${query}%`);
    }

    if (category) {
      sql += ` AND service_category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ' ORDER BY service_name ASC';

    const result = await db.query<CancellationGuide>(sql, params);
    return result.rows;
  }

  /**
   * Get all available cancellation guides
   */
  async getAllGuides(): Promise<CancellationGuide[]> {
    const result = await db.query<CancellationGuide>(
      `SELECT * FROM cancellation_guides
       ORDER BY service_category, service_name`
    );

    return result.rows;
  }

  /**
   * Create or update cancellation guide
   */
  async upsertGuide(guide: Partial<CancellationGuide>): Promise<CancellationGuide> {
    const {
      service_name,
      service_category,
      difficulty,
      estimated_time_minutes,
      cancellation_methods,
      primary_method,
      cancellation_url,
      requires_login,
      support_email,
      email_template,
      support_phone,
      phone_hours,
      steps,
      warnings,
      tips,
      refund_policy,
      refund_eligible_days,
      pause_available,
      downgrade_available,
      last_verified,
      success_rate,
      average_response_time_hours,
    } = guide;

    const result = await db.query<CancellationGuide>(
      `INSERT INTO cancellation_guides (
        service_name, service_category, difficulty, estimated_time_minutes,
        cancellation_methods, primary_method, cancellation_url, requires_login,
        support_email, email_template, support_phone, phone_hours,
        steps, warnings, tips, refund_policy, refund_eligible_days,
        pause_available, downgrade_available, last_verified, success_rate,
        average_response_time_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (service_name)
      DO UPDATE SET
        service_category = EXCLUDED.service_category,
        difficulty = EXCLUDED.difficulty,
        estimated_time_minutes = EXCLUDED.estimated_time_minutes,
        cancellation_methods = EXCLUDED.cancellation_methods,
        primary_method = EXCLUDED.primary_method,
        cancellation_url = EXCLUDED.cancellation_url,
        requires_login = EXCLUDED.requires_login,
        support_email = EXCLUDED.support_email,
        email_template = EXCLUDED.email_template,
        support_phone = EXCLUDED.support_phone,
        phone_hours = EXCLUDED.phone_hours,
        steps = EXCLUDED.steps,
        warnings = EXCLUDED.warnings,
        tips = EXCLUDED.tips,
        refund_policy = EXCLUDED.refund_policy,
        refund_eligible_days = EXCLUDED.refund_eligible_days,
        pause_available = EXCLUDED.pause_available,
        downgrade_available = EXCLUDED.downgrade_available,
        last_verified = EXCLUDED.last_verified,
        success_rate = EXCLUDED.success_rate,
        average_response_time_hours = EXCLUDED.average_response_time_hours,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        service_name,
        service_category,
        difficulty,
        estimated_time_minutes,
        cancellation_methods,
        primary_method,
        cancellation_url,
        requires_login ?? true,
        support_email,
        email_template,
        support_phone,
        phone_hours,
        steps ? JSON.stringify(steps) : null,
        warnings ? JSON.stringify(warnings) : null,
        tips ? JSON.stringify(tips) : null,
        refund_policy,
        refund_eligible_days,
        pause_available ?? false,
        downgrade_available ?? false,
        last_verified,
        success_rate,
        average_response_time_hours,
      ]
    );

    return result.rows[0];
  }

  /**
   * Draft cancellation email using AI
   */
  async draftCancellationEmail(params: {
    serviceName: string;
    userName?: string;
    userEmail?: string;
    accountId?: string;
    reason?: string;
    subscriptionDetails?: {
      planName?: string;
      monthlyAmount?: number;
      startDate?: Date;
    };
  }): Promise<{
    subject: string;
    body: string;
    toEmail?: string;
  }> {
    const { serviceName, userName, userEmail, accountId, reason, subscriptionDetails } = params;

    // Get guide for template and support email
    const guide = await this.getGuide(serviceName);

    // Use template if available
    if (guide?.email_template) {
      const subject = `Cancellation Request - ${serviceName}`;
      let body = guide.email_template;

      // Replace placeholders
      body = body
        .replace(/{userName}/g, userName || 'User')
        .replace(/{userEmail}/g, userEmail || '')
        .replace(/{accountId}/g, accountId || '')
        .replace(/{serviceName}/g, serviceName)
        .replace(/{reason}/g, reason || 'personal reasons')
        .replace(/{date}/g, new Date().toLocaleDateString());

      return {
        subject,
        body,
        toEmail: guide.support_email || undefined,
      };
    }

    // Use AI to draft email if OpenAI is available
    if (this.openai) {
      const prompt = `Draft a polite and professional cancellation email for ${serviceName}.

User Details:
- Name: ${userName || 'Not provided'}
- Email: ${userEmail || 'Not provided'}
- Account ID: ${accountId || 'Not provided'}
${subscriptionDetails?.planName ? `- Plan: ${subscriptionDetails.planName}` : ''}
${subscriptionDetails?.monthlyAmount ? `- Monthly Amount: ${subscriptionDetails.monthlyAmount}` : ''}
${subscriptionDetails?.startDate ? `- Member Since: ${subscriptionDetails.startDate.toLocaleDateString()}` : ''}

Reason for cancellation: ${reason || 'Personal reasons'}

Requirements:
1. Be polite and professional
2. Clearly state the intent to cancel
3. Request confirmation of cancellation
4. Ask about refund policy if applicable
5. Request confirmation that no future charges will occur
6. Thank them for their service
7. Keep it concise (under 200 words)

Format:
Subject: [subject line]
Body: [email body]`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that drafts professional cancellation emails.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || '';

      // Parse subject and body
      const subjectMatch = response.match(/Subject:\s*(.+)/i);
      const bodyMatch = response.match(/Body:\s*([\s\S]+)/i);

      const subject = subjectMatch ? subjectMatch[1].trim() : `Cancellation Request - ${serviceName}`;
      const body = bodyMatch
        ? bodyMatch[1].trim()
        : response.replace(/Subject:.+\n/i, '').trim();

      return {
        subject,
        body,
        toEmail: guide?.support_email || undefined,
      };
    }

    // Fallback: Generate basic email
    const subject = `Cancellation Request - ${serviceName}`;
    const body = `Dear ${serviceName} Support Team,

I am writing to request the cancellation of my subscription.

Account Details:
${userName ? `Name: ${userName}\n` : ''}${userEmail ? `Email: ${userEmail}\n` : ''}${accountId ? `Account ID: ${accountId}\n` : ''}

${reason ? `Reason for cancellation: ${reason}\n\n` : ''}I would like to confirm that:
1. My subscription will be cancelled effective immediately
2. No further charges will be made to my account
3. I understand the refund policy

Please send me a confirmation once the cancellation is processed.

Thank you for your service.

Best regards,
${userName || 'User'}`;

    return {
      subject,
      body,
      toEmail: guide?.support_email || undefined,
    };
  }

  /**
   * Initiate cancellation request
   */
  async initiateCancellation(params: {
    userId: string;
    subscriptionId?: string;
    serviceName: string;
    method: CancellationMethod;
    emailSubject?: string;
    emailBody?: string;
  }): Promise<CancellationRequest> {
    const { userId, subscriptionId, serviceName, method, emailSubject, emailBody } = params;

    const result = await db.query<CancellationRequest>(
      `INSERT INTO cancellation_requests (
        user_id, subscription_id, service_name, method_used,
        status, email_subject, email_body, email_sent_at
      )
      VALUES ($1, $2, $3, $4, 'initiated', $5, $6, $7)
      RETURNING *`,
      [
        userId,
        subscriptionId || null,
        serviceName,
        method,
        emailSubject || null,
        emailBody || null,
        method === 'email' && emailSubject && emailBody ? new Date() : null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Get cancellation requests for a user
   */
  async getUserCancellationRequests(userId: string): Promise<CancellationRequest[]> {
    const result = await db.query<CancellationRequest>(
      `SELECT * FROM cancellation_requests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Update cancellation request status
   */
  async updateCancellationRequest(
    requestId: string,
    userId: string,
    updates: {
      status?: string;
      responseReceived?: boolean;
      responseDate?: Date;
      cancelledSuccessfully?: boolean;
      cancellationDate?: Date;
      refundReceived?: boolean;
      refundAmount?: number;
      difficultyRating?: number;
      feedbackNotes?: string;
    }
  ): Promise<CancellationRequest> {
    const fields: string[] = [];
    const values: any[] = [requestId, userId];
    let paramIndex = 3;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.responseReceived !== undefined) {
      fields.push(`response_received = $${paramIndex++}`);
      values.push(updates.responseReceived);
    }

    if (updates.responseDate !== undefined) {
      fields.push(`response_date = $${paramIndex++}`);
      values.push(updates.responseDate);
    }

    if (updates.cancelledSuccessfully !== undefined) {
      fields.push(`cancelled_successfully = $${paramIndex++}`);
      values.push(updates.cancelledSuccessfully);
    }

    if (updates.cancellationDate !== undefined) {
      fields.push(`cancellation_date = $${paramIndex++}`);
      values.push(updates.cancellationDate);
    }

    if (updates.refundReceived !== undefined) {
      fields.push(`refund_received = $${paramIndex++}`);
      values.push(updates.refundReceived);
    }

    if (updates.refundAmount !== undefined) {
      fields.push(`refund_amount = $${paramIndex++}`);
      values.push(updates.refundAmount);
    }

    if (updates.difficultyRating !== undefined) {
      fields.push(`difficulty_rating = $${paramIndex++}`);
      values.push(updates.difficultyRating);
    }

    if (updates.feedbackNotes !== undefined) {
      fields.push(`feedback_notes = $${paramIndex++}`);
      values.push(updates.feedbackNotes);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE cancellation_requests
      SET ${fields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query<CancellationRequest>(query, values);

    if (result.rows.length === 0) {
      throw new Error('Cancellation request not found');
    }

    return result.rows[0];
  }

  /**
   * Get cancellation statistics
   */
  async getCancellationStats(): Promise<{
    totalGuides: number;
    byDifficulty: Record<string, number>;
    byCategory: Record<string, number>;
    averageSuccessRate: number;
  }> {
    const guides = await this.getAllGuides();

    const byDifficulty: Record<string, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
      very_hard: 0,
    };

    const byCategory: Record<string, number> = {};

    let totalSuccessRate = 0;
    let guidesWithSuccessRate = 0;

    guides.forEach((guide) => {
      byDifficulty[guide.difficulty]++;

      if (guide.service_category) {
        byCategory[guide.service_category] = (byCategory[guide.service_category] || 0) + 1;
      }

      if (guide.success_rate) {
        totalSuccessRate += guide.success_rate;
        guidesWithSuccessRate++;
      }
    });

    return {
      totalGuides: guides.length,
      byDifficulty,
      byCategory,
      averageSuccessRate: guidesWithSuccessRate > 0 ? totalSuccessRate / guidesWithSuccessRate : 0,
    };
  }
}

// Export singleton instance
export const cancellationService = new CancellationService();
