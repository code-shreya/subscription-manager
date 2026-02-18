import { z } from 'zod';

/**
 * Validation schemas for subscriptions
 */

// Billing cycle enum
const billingCycleEnum = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time']);

// Subscription status enum
const subscriptionStatusEnum = z.enum(['active', 'cancelled', 'expired', 'paused']);

// Create subscription schema
export const createSubscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must not exceed 255 characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category must not exceed 100 characters'),
  amount: z.number().positive('Amount must be positive').optional().nullable(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('INR'),
  billing_cycle: billingCycleEnum,
  next_billing_date: z.string().datetime().optional().nullable(),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional().nullable(),
  website_url: z.string().url('Invalid website URL').optional().nullable(),
  reminder_days_before: z.number().int().min(0).max(365).default(3),
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

// Update subscription schema (all fields optional except those needed for updates)
export const updateSubscriptionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional(),
  billing_cycle: billingCycleEnum.optional(),
  next_billing_date: z.string().datetime().optional().nullable(),
  status: subscriptionStatusEnum.optional(),
  description: z.string().max(1000).optional().nullable(),
  website_url: z.string().url().optional().nullable(),
  reminder_days_before: z.number().int().min(0).max(365).optional(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

// Query parameters for listing subscriptions
export const listSubscriptionsQuerySchema = z.object({
  status: subscriptionStatusEnum.optional(),
  category: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
});

export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
