import { z } from 'zod';

/**
 * Validation schemas for detection
 */

// Email scan request schema
export const emailScanSchema = z.object({
  maxEmails: z.number().int().positive().max(500).default(200),
  daysBack: z.number().int().positive().max(730).default(365),
  deepScan: z.boolean().default(false),
});

export type EmailScanInput = z.infer<typeof emailScanSchema>;

// Import detection schema
export const importDetectionSchema = z.object({
  detectionId: z.string().uuid('Invalid detection ID'),
});

export type ImportDetectionInput = z.infer<typeof importDetectionSchema>;

// Update detection status schema
export const updateDetectionStatusSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
});

export type UpdateDetectionStatusInput = z.infer<typeof updateDetectionStatusSchema>;

// Detection result from AI
export interface AIDetectionResult {
  isSubscription: boolean;
  isConfirmationEmail?: boolean;
  emailType?: string;
  serviceName?: string;
  amount?: number | null;
  currency?: string | null;
  billingCycle?: string;
  nextBillingDate?: string | null;
  category?: string;
  confidence?: number;
  description?: string;
  foundKeywords?: string[];
}

// Detection source
export type DetectionSource = 'email' | 'bank' | 'sms';

// Detection with metadata
export interface Detection {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  amount: number | null;
  currency: string;
  billingCycle: string | null;
  nextBillingDate: Date | null;
  description: string | null;
  confidenceScore: number | null;
  source: DetectionSource;
  sourceIdentifier: string | null;
  rawData: any;
  status: string;
  detectedAt: Date;
}
