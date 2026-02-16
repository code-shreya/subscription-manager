import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_FILE = path.join(__dirname, '..', 'subscription-history.json');

class AnalysisService {
  constructor() {
    this.initializeHistoryFile();
  }

  // Initialize history tracking file
  async initializeHistoryFile() {
    if (!existsSync(HISTORY_FILE)) {
      const initialData = {
        priceHistory: [], // Track price changes over time
        detectionHistory: [], // Track all detected subscriptions with timestamps
        insights: {
          lastDeepScan: null,
          totalScanned: 0,
          uniqueServices: 0,
          priceChangesDetected: 0,
        },
      };
      await fs.writeFile(HISTORY_FILE, JSON.stringify(initialData, null, 2));
      console.log('✅ Subscription history file initialized');
    }
  }

  // Read history data
  async readHistory() {
    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading history:', error.message);
      return {
        priceHistory: [],
        detectionHistory: [],
        insights: {},
      };
    }
  }

  // Write history data
  async writeHistory(data) {
    try {
      await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing history:', error.message);
    }
  }

  // Deduplicate detected subscriptions
  deduplicateSubscriptions(detectedSubs) {
    const seen = new Map();
    const deduplicated = [];

    // Sort by confidence (highest first) so we keep the best detection
    const sorted = [...detectedSubs].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    for (const sub of sorted) {
      // Create a key based on service name (normalized)
      const key = sub.serviceName?.toLowerCase().trim();

      if (!key) continue;

      if (!seen.has(key)) {
        seen.set(key, sub);
        deduplicated.push(sub);
      } else {
        // If we've seen this service, check if this one has more info
        const existing = seen.get(key);

        // Update if this one has amount and existing doesn't
        if (sub.amount && !existing.amount) {
          seen.set(key, sub);
          // Replace in deduplicated array
          const index = deduplicated.findIndex(s => s.serviceName?.toLowerCase().trim() === key);
          if (index >= 0) {
            deduplicated[index] = sub;
          }
        }
      }
    }

    console.log(`🔍 Deduplicated: ${detectedSubs.length} → ${deduplicated.length} unique subscriptions`);
    return deduplicated;
  }

  // Track price changes by comparing with history
  async detectPriceChanges(newDetections) {
    const history = await this.readHistory();
    const priceChanges = [];

    for (const newSub of newDetections) {
      if (!newSub.serviceName || !newSub.amount) continue;

      // Look for previous detections of this service
      const previousDetections = history.priceHistory.filter(
        (h) => h.serviceName?.toLowerCase() === newSub.serviceName?.toLowerCase()
      );

      if (previousDetections.length > 0) {
        // Get most recent previous price
        const sortedPrevious = previousDetections.sort(
          (a, b) => new Date(b.detectedAt) - new Date(a.detectedAt)
        );
        const lastPrice = sortedPrevious[0].amount;

        // Check if price changed
        if (lastPrice !== newSub.amount) {
          const change = {
            serviceName: newSub.serviceName,
            oldPrice: lastPrice,
            newPrice: newSub.amount,
            currency: newSub.currency || 'INR',
            changeAmount: newSub.amount - lastPrice,
            changePercentage: ((newSub.amount - lastPrice) / lastPrice) * 100,
            detectedAt: new Date().toISOString(),
            trend: newSub.amount > lastPrice ? 'increase' : 'decrease',
          };

          priceChanges.push(change);
          console.log(
            `💰 Price change detected for ${change.serviceName}: ${change.currency}${change.oldPrice} → ${change.currency}${change.newPrice} (${change.changePercentage > 0 ? '+' : ''}${change.changePercentage.toFixed(1)}%)`
          );
        }
      }

      // Add to price history
      history.priceHistory.push({
        serviceName: newSub.serviceName,
        amount: newSub.amount,
        currency: newSub.currency || 'INR',
        billingCycle: newSub.billingCycle,
        detectedAt: new Date().toISOString(),
        emailDate: newSub.emailDate,
      });
    }

    // Update insights
    history.insights.priceChangesDetected =
      (history.insights.priceChangesDetected || 0) + priceChanges.length;

    await this.writeHistory(history);

    return priceChanges;
  }

  // Analyze patterns across 365 days
  async analyzeYearlyPatterns(detectedSubscriptions) {
    console.log('📊 Analyzing yearly patterns...');

    const analysis = {
      totalFound: detectedSubscriptions.length,
      uniqueServices: new Set(detectedSubscriptions.map((s) => s.serviceName)).size,
      byCategory: {},
      byMonth: {},
      byCurrency: {},
      byBillingCycle: {},
      averageConfidence: 0,
      estimatedAnnualCost: 0,
      topServices: [],
      cancelSuggestions: [],
    };

    // Group by category
    detectedSubscriptions.forEach((sub) => {
      const category = sub.category || 'Other';
      analysis.byCategory[category] = (analysis.byCategory[category] || 0) + 1;
    });

    // Group by month (from email dates)
    detectedSubscriptions.forEach((sub) => {
      if (sub.emailDate) {
        try {
          const date = new Date(sub.emailDate);
          const month = date.toLocaleString('default', { month: 'short' });
          analysis.byMonth[month] = (analysis.byMonth[month] || 0) + 1;
        } catch (e) {
          // Skip invalid dates
        }
      }
    });

    // Group by currency
    detectedSubscriptions.forEach((sub) => {
      const currency = sub.currency || 'Unknown';
      analysis.byCurrency[currency] = (analysis.byCurrency[currency] || 0) + 1;
    });

    // Group by billing cycle
    detectedSubscriptions.forEach((sub) => {
      const cycle = sub.billingCycle || 'unknown';
      analysis.byBillingCycle[cycle] = (analysis.byBillingCycle[cycle] || 0) + 1;
    });

    // Calculate average confidence
    const totalConfidence = detectedSubscriptions.reduce((sum, s) => sum + (s.confidence || 0), 0);
    analysis.averageConfidence = Math.round(totalConfidence / detectedSubscriptions.length);

    // Estimate annual cost
    detectedSubscriptions.forEach((sub) => {
      if (sub.amount) {
        if (sub.billingCycle === 'monthly') {
          analysis.estimatedAnnualCost += sub.amount * 12;
        } else if (sub.billingCycle === 'yearly') {
          analysis.estimatedAnnualCost += sub.amount;
        } else if (sub.billingCycle === 'quarterly') {
          analysis.estimatedAnnualCost += sub.amount * 4;
        }
      }
    });

    // Find top services by frequency (multiple detections = actively used)
    const serviceCounts = {};
    detectedSubscriptions.forEach((sub) => {
      const name = sub.serviceName;
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
    });

    analysis.topServices = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, detectionCount: count }));

    // Generate cancel suggestions for expensive/rarely used subscriptions
    const serviceAmounts = new Map();
    detectedSubscriptions.forEach((sub) => {
      if (sub.serviceName && sub.amount) {
        const existing = serviceAmounts.get(sub.serviceName);
        if (!existing || existing.amount < sub.amount) {
          serviceAmounts.set(sub.serviceName, sub);
        }
      }
    });

    const expensiveThreshold = 500; // INR per month
    serviceAmounts.forEach((sub, name) => {
      const monthlyAmount =
        sub.billingCycle === 'yearly'
          ? sub.amount / 12
          : sub.billingCycle === 'quarterly'
          ? sub.amount / 3
          : sub.amount;

      const detectionCount = serviceCounts[name] || 0;

      if (monthlyAmount > expensiveThreshold && detectionCount < 3) {
        analysis.cancelSuggestions.push({
          service: name,
          reason: detectionCount < 2 ? 'Rarely used (few emails detected)' : 'Expensive subscription',
          monthlyAmount: Math.round(monthlyAmount),
          currency: sub.currency || 'INR',
          annualSavings: Math.round(monthlyAmount * 12),
        });
      }
    });

    return analysis;
  }

  // Generate insights report
  async generateInsightsReport(detectedSubscriptions, priceChanges) {
    const patterns = await this.analyzeYearlyPatterns(detectedSubscriptions);

    const report = {
      scanDate: new Date().toISOString(),
      summary: {
        totalSubscriptionsFound: patterns.totalFound,
        uniqueServices: patterns.uniqueServices,
        estimatedAnnualCost: Math.round(patterns.estimatedAnnualCost),
        averageConfidence: patterns.averageConfidence,
        priceChangesDetected: priceChanges.length,
      },
      breakdown: {
        byCategory: patterns.byCategory,
        byBillingCycle: patterns.byBillingCycle,
        byCurrency: patterns.byCurrency,
        byMonth: patterns.byMonth,
      },
      insights: {
        topServices: patterns.topServices,
        priceChanges: priceChanges,
        cancelSuggestions: patterns.cancelSuggestions.slice(0, 5), // Top 5
      },
      recommendations: this.generateRecommendations(patterns, priceChanges),
    };

    // Save to history
    const history = await this.readHistory();
    history.insights.lastDeepScan = new Date().toISOString();
    history.insights.totalScanned = patterns.totalFound;
    history.insights.uniqueServices = patterns.uniqueServices;
    await this.writeHistory(history);

    return report;
  }

  // Generate actionable recommendations
  generateRecommendations(patterns, priceChanges) {
    const recommendations = [];

    // Recommendation: High spending
    if (patterns.estimatedAnnualCost > 50000) {
      // > ₹50k/year
      recommendations.push({
        type: 'high_spending',
        priority: 'high',
        title: 'High Annual Subscription Cost',
        description: `You're spending approximately ₹${Math.round(patterns.estimatedAnnualCost).toLocaleString()} annually on subscriptions.`,
        action: 'Review your subscriptions and consider canceling unused services.',
      });
    }

    // Recommendation: Price increases
    if (priceChanges.some((c) => c.trend === 'increase')) {
      const increases = priceChanges.filter((c) => c.trend === 'increase');
      recommendations.push({
        type: 'price_increase',
        priority: 'medium',
        title: `${increases.length} Price Increase${increases.length > 1 ? 's' : ''} Detected`,
        description: increases.map((c) => `${c.serviceName}: +${c.changePercentage.toFixed(1)}%`).join(', '),
        action: 'Review these subscriptions to see if they still provide value.',
      });
    }

    // Recommendation: Many subscriptions
    if (patterns.uniqueServices > 10) {
      recommendations.push({
        type: 'subscription_overload',
        priority: 'medium',
        title: 'Multiple Active Subscriptions',
        description: `You have ${patterns.uniqueServices} different active subscriptions.`,
        action: 'Consider consolidating services or using family plans to save money.',
      });
    }

    // Recommendation: Expensive underused services
    if (patterns.cancelSuggestions.length > 0) {
      recommendations.push({
        type: 'cancel_suggestion',
        priority: 'high',
        title: 'Potential Savings Identified',
        description: `You could save up to ₹${patterns.cancelSuggestions[0].annualSavings.toLocaleString()}/year by canceling ${patterns.cancelSuggestions[0].service}.`,
        action: 'Review rarely used expensive subscriptions.',
      });
    }

    return recommendations;
  }
}

export default new AnalysisService();
