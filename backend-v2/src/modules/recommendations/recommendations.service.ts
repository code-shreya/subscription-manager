import { db } from '../../config/database';
import { Subscription } from '../../db/types';
import OpenAI from 'openai';

export interface Recommendation {
  type:
    | 'duplicate'
    | 'downgrade'
    | 'alternative'
    | 'family_plan'
    | 'bundle'
    | 'cancel'
    | 'high_spending'
    | 'price_increase';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  potentialSavings?: number;
  affectedSubscriptions?: string[];
  metadata?: any;
}

/**
 * Recommendations Service
 * AI-powered savings recommendations and subscription optimization
 */
export class RecommendationsService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Get all recommendations for a user
   */
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const subscriptions = await this.getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      return [];
    }

    const recommendations: Recommendation[] = [];

    // Detect duplicates
    recommendations.push(...(await this.detectDuplicates(subscriptions)));

    // Suggest downgrades
    recommendations.push(...(await this.suggestDowngrades(subscriptions)));

    // Suggest alternatives
    recommendations.push(...(await this.suggestAlternatives(subscriptions)));

    // Suggest family plans
    recommendations.push(...(await this.suggestFamilyPlans(subscriptions)));

    // Detect high spending
    recommendations.push(...(await this.detectHighSpending(subscriptions)));

    // Suggest bundling opportunities
    recommendations.push(...(await this.suggestBundles(subscriptions)));

    // Sort by priority and potential savings
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return (b.potentialSavings || 0) - (a.potentialSavings || 0);
    });
  }

  /**
   * Detect duplicate subscriptions
   */
  private async detectDuplicates(subscriptions: Subscription[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const nameMap = new Map<string, Subscription[]>();

    // Group by similar names
    subscriptions.forEach((sub) => {
      const normalizedName = sub.name.toLowerCase().trim();
      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, []);
      }
      nameMap.get(normalizedName)!.push(sub);
    });

    // Find duplicates
    nameMap.forEach((subs, _name) => {
      if (subs.length > 1) {
        const totalCost = subs.reduce((sum, s) => sum + (s.amount || 0), 0);
        const savings = totalCost - (subs[0].amount || 0);

        recommendations.push({
          type: 'duplicate',
          priority: 'high',
          title: `Duplicate Subscription: ${subs[0].name}`,
          description: `You have ${subs.length} active subscriptions for ${subs[0].name}`,
          action: `Cancel ${subs.length - 1} duplicate subscription${subs.length > 2 ? 's' : ''} to save money`,
          potentialSavings: Math.round(savings * 100) / 100,
          affectedSubscriptions: subs.map((s) => s.id),
        });
      }
    });

    return recommendations;
  }

  /**
   * Suggest downgrades (cheaper plans)
   */
  private async suggestDowngrades(subscriptions: Subscription[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const downgradeOpportunities: Record<
      string,
      { from: string; to: string; savings: number; reason: string }
    > = {
      'Netflix India': {
        from: 'Premium',
        to: 'Basic',
        savings: 200,
        reason: 'Basic plan sufficient for single-screen viewing',
      },
      'Disney+ Hotstar': {
        from: 'Premium',
        to: 'Super',
        savings: 600,
        reason: 'Super plan offers most content without 4K',
      },
      'Spotify India': {
        from: 'Premium',
        to: 'Free',
        savings: 119,
        reason: 'Free tier with ads is available',
      },
      'YouTube Premium': {
        from: 'Premium',
        to: 'Free',
        savings: 129,
        reason: 'Consider if ad-free is worth the cost',
      },
    };

    subscriptions.forEach((sub) => {
      const opportunity = downgradeOpportunities[sub.name];
      if (opportunity && (sub.amount || 0) >= opportunity.savings) {
        recommendations.push({
          type: 'downgrade',
          priority: 'medium',
          title: `Downgrade ${sub.name}`,
          description: `Consider downgrading from ${opportunity.from} to ${opportunity.to} plan`,
          action: opportunity.reason,
          potentialSavings: opportunity.savings,
          affectedSubscriptions: [sub.id],
        });
      }
    });

    return recommendations;
  }

  /**
   * Suggest alternative services
   */
  private async suggestAlternatives(subscriptions: Subscription[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const alternatives: Record<string, { alternative: string; savings: number; reason: string }> = {
      'Adobe Creative Cloud': {
        alternative: 'Canva Pro or Affinity Suite',
        savings: 1200,
        reason: 'One-time purchase alternatives available',
      },
      'Microsoft 365': {
        alternative: 'Google Workspace or LibreOffice',
        savings: 400,
        reason: 'Free alternatives with similar features',
      },
      'Spotify India': {
        alternative: 'YouTube Music (free with YouTube Premium)',
        savings: 119,
        reason: 'Bundled with YouTube Premium',
      },
      'Netflix India': {
        alternative: 'Disney+ Hotstar or Amazon Prime',
        savings: 0,
        reason: 'More Indian content, similar pricing',
      },
    };

    subscriptions.forEach((sub) => {
      const alternative = alternatives[sub.name];
      if (alternative) {
        recommendations.push({
          type: 'alternative',
          priority: alternative.savings > 500 ? 'high' : 'medium',
          title: `Alternative to ${sub.name}`,
          description: `Consider ${alternative.alternative}`,
          action: alternative.reason,
          potentialSavings: alternative.savings,
          affectedSubscriptions: [sub.id],
        });
      }
    });

    return recommendations;
  }

  /**
   * Suggest family plans
   */
  private async suggestFamilyPlans(subscriptions: Subscription[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const familyPlans: Record<
      string,
      { currentIndividual: number; familyCost: number; maxMembers: number }
    > = {
      'Netflix India': { currentIndividual: 649, familyCost: 649, maxMembers: 4 },
      'Spotify India': { currentIndividual: 119, familyCost: 179, maxMembers: 6 },
      'YouTube Premium': { currentIndividual: 129, familyCost: 189, maxMembers: 5 },
      'Apple Music': { currentIndividual: 99, familyCost: 149, maxMembers: 6 },
      'Amazon Prime': { currentIndividual: 1499, familyCost: 1499, maxMembers: 2 },
      'Disney+ Hotstar': { currentIndividual: 1499, familyCost: 1499, maxMembers: 4 },
    };

    subscriptions.forEach((sub) => {
      const familyPlan = familyPlans[sub.name];
      if (familyPlan) {
        const currentCost = sub.amount || familyPlan.currentIndividual;
        const costPerMemberInFamily = familyPlan.familyCost / familyPlan.maxMembers;
        const savingsPerPerson = currentCost - costPerMemberInFamily;

        if (savingsPerPerson > 0) {
          recommendations.push({
            type: 'family_plan',
            priority: savingsPerPerson > 50 ? 'high' : 'medium',
            title: `${sub.name} Family Plan`,
            description: `Share with ${familyPlan.maxMembers} members for ₹${Math.round(costPerMemberInFamily)}/person`,
            action: `Switch to family plan and save ₹${Math.round(savingsPerPerson * 12)}/year`,
            potentialSavings: Math.round(savingsPerPerson * 12),
            affectedSubscriptions: [sub.id],
            metadata: {
              familyCost: familyPlan.familyCost,
              maxMembers: familyPlan.maxMembers,
              costPerMember: Math.round(costPerMemberInFamily),
            },
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * Detect high spending
   */
  private async detectHighSpending(subscriptions: Subscription[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Calculate monthly and annual costs
    let monthlyTotal = 0;

    subscriptions.forEach((sub) => {
      const amount = sub.amount || 0;
      let monthlyAmount = amount;

      switch (sub.billing_cycle) {
        case 'daily':
          monthlyAmount = amount * 30;
          break;
        case 'weekly':
          monthlyAmount = amount * 4.33;
          break;
        case 'quarterly':
          monthlyAmount = amount / 3;
          break;
        case 'yearly':
          monthlyAmount = amount / 12;
          break;
        case 'one-time':
          monthlyAmount = 0;
          break;
      }

      monthlyTotal += monthlyAmount;
    });

    const annualTotal = monthlyTotal * 12;

    if (annualTotal > 50000) {
      recommendations.push({
        type: 'high_spending',
        priority: 'high',
        title: 'High Annual Subscription Cost',
        description: `You're spending approximately ₹${Math.round(annualTotal).toLocaleString()}/year on subscriptions`,
        action: 'Review your subscriptions and consider canceling unused services',
        metadata: {
          monthlyTotal: Math.round(monthlyTotal),
          annualTotal: Math.round(annualTotal),
        },
      });
    } else if (annualTotal > 25000) {
      recommendations.push({
        type: 'high_spending',
        priority: 'medium',
        title: 'Moderate Subscription Spending',
        description: `You're spending ₹${Math.round(annualTotal).toLocaleString()}/year on subscriptions`,
        action: 'Look for opportunities to consolidate or downgrade services',
        metadata: {
          monthlyTotal: Math.round(monthlyTotal),
          annualTotal: Math.round(annualTotal),
        },
      });
    }

    return recommendations;
  }

  /**
   * Suggest bundling opportunities
   */
  private async suggestBundles(subscriptions: Subscription[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const subNames = subscriptions.map((s) => s.name.toLowerCase());

    // Amazon Prime + Prime Video bundle
    if (subNames.includes('amazon prime video') && !subNames.includes('amazon prime')) {
      recommendations.push({
        type: 'bundle',
        priority: 'medium',
        title: 'Amazon Prime Bundle',
        description: 'Get Amazon Prime instead of just Prime Video',
        action: 'Includes free shipping, Prime Music, and Prime Video for ₹1499/year',
        potentialSavings: 0,
        metadata: {
          bundle: 'Amazon Prime',
          includes: ['Prime Video', 'Free Shipping', 'Prime Music', 'Prime Reading'],
        },
      });
    }

    // YouTube Premium + YouTube Music
    if (subNames.includes('youtube music') && !subNames.includes('youtube premium')) {
      const ytMusic = subscriptions.find((s) => s.name.toLowerCase().includes('youtube music'));
      const savings = (ytMusic?.amount || 0) * 12;

      recommendations.push({
        type: 'bundle',
        priority: 'medium',
        title: 'YouTube Premium Bundle',
        description: 'YouTube Premium includes YouTube Music',
        action: 'Get ad-free YouTube + Music for just ₹129/month',
        potentialSavings: Math.round(savings),
        metadata: {
          bundle: 'YouTube Premium',
          includes: ['Ad-free YouTube', 'YouTube Music', 'Background play', 'Downloads'],
        },
      });
    }

    // Microsoft 365 + OneDrive
    if (
      (subNames.includes('onedrive') || subNames.includes('office')) &&
      !subNames.includes('microsoft 365')
    ) {
      recommendations.push({
        type: 'bundle',
        priority: 'low',
        title: 'Microsoft 365 Family',
        description: 'Bundle Office + OneDrive for better value',
        action: 'Get Office apps + 1TB OneDrive for ₹489/month',
        metadata: {
          bundle: 'Microsoft 365',
          includes: ['Word', 'Excel', 'PowerPoint', 'OneDrive 1TB', 'Outlook'],
        },
      });
    }

    return recommendations;
  }

  /**
   * Get AI-powered personalized recommendations
   */
  async getAIRecommendations(userId: string): Promise<{ recommendations: string[]; summary: string }> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const subscriptions = await this.getUserSubscriptions(userId);
    const basicRecommendations = await this.getRecommendations(userId);

    // Prepare data for AI
    const subscriptionList = subscriptions
      .map(
        (s) =>
          `- ${s.name} (${s.category}): ₹${s.amount}/${s.billing_cycle}${s.status !== 'active' ? ` [${s.status}]` : ''}`
      )
      .join('\n');

    const totalMonthly = subscriptions.reduce((sum, s) => {
      let monthly = s.amount || 0;
      if (s.billing_cycle === 'yearly') monthly /= 12;
      if (s.billing_cycle === 'quarterly') monthly /= 3;
      return sum + monthly;
    }, 0);

    const prompt = `You are a financial advisor specializing in subscription management. Analyze these subscriptions and provide personalized money-saving recommendations.

User's Subscriptions:
${subscriptionList}

Current Spending: ₹${Math.round(totalMonthly)}/month (₹${Math.round(totalMonthly * 12)}/year)

Existing Recommendations:
${basicRecommendations.map((r) => `- ${r.title}: ${r.description}`).join('\n')}

Provide:
1. A brief summary of their subscription spending pattern (2 sentences)
2. Top 3 personalized recommendations to save money (be specific to their subscriptions)

Keep recommendations actionable and India-focused.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor focused on subscription optimization.',
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

    // Parse response
    const lines = response.split('\n').filter((l) => l.trim());
    const summary = lines.slice(0, 2).join(' ');
    const recommendations = lines
      .slice(2)
      .filter((l) => l.match(/^\d\./))
      .map((l) => l.replace(/^\d\.\s*/, ''));

    return {
      summary,
      recommendations: recommendations.length > 0 ? recommendations : ['No additional recommendations'],
    };
  }

  /**
   * Get user's active subscriptions
   */
  private async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const result = await db.query<Subscription>(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY amount DESC NULLS LAST`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get recommendation statistics
   */
  async getRecommendationStats(userId: string): Promise<{
    totalRecommendations: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    totalPotentialSavings: number;
  }> {
    const recommendations = await this.getRecommendations(userId);

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalPotentialSavings = 0;

    recommendations.forEach((rec) => {
      byType[rec.type] = (byType[rec.type] || 0) + 1;
      byPriority[rec.priority] = (byPriority[rec.priority] || 0) + 1;
      totalPotentialSavings += rec.potentialSavings || 0;
    });

    return {
      totalRecommendations: recommendations.length,
      byType,
      byPriority,
      totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
    };
  }
}

// Export singleton instance
export const recommendationsService = new RecommendationsService();
