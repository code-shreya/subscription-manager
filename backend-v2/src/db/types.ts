/**
 * Database type definitions matching PostgreSQL schema
 */

// Enums
export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused';
export type SubscriptionSource = 'manual' | 'email' | 'bank' | 'sms';
export type DetectionStatus = 'pending' | 'confirmed' | 'rejected' | 'imported';
export type DetectionSource = 'email' | 'bank' | 'sms';
export type AccountType = 'gmail' | 'outlook' | 'yahoo' | 'imap' | 'bank' | 'upi';
export type AccountStatus = 'active' | 'disconnected' | 'expired' | 'error';
export type TransactionType = 'debit' | 'credit';
export type NotificationType =
  | 'renewal_reminder'
  | 'price_change'
  | 'payment_failed'
  | 'budget_exceeded'
  | 'budget_warning'
  | 'new_detection'
  | 'subscription_expired'
  | 'family_invite';
export type NotificationChannel = 'email' | 'push' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';
export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type BudgetStatus = 'active' | 'exceeded' | 'warning' | 'paused';
export type PriceChangeType = 'increase' | 'decrease' | 'no_change';
export type MemberRole = 'owner' | 'admin' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type CancellationDifficulty = 'easy' | 'medium' | 'hard' | 'very_hard';
export type CancellationMethod = 'online' | 'email' | 'phone' | 'in_app' | 'chat';

// User
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Subscription
export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category: string;
  amount: number | null;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: Date | null;
  status: SubscriptionStatus;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  reminder_days_before: number;
  source: SubscriptionSource;
  notes: string | null;
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
}

// Detected Subscription
export interface DetectedSubscription {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  amount: number | null;
  currency: string;
  billing_cycle: BillingCycle | null;
  next_billing_date: Date | null;
  description: string | null;
  confidence_score: number | null;
  source: DetectionSource;
  source_identifier: string | null;
  raw_data: any;
  status: DetectionStatus;
  imported_subscription_id: string | null;
  detected_at: Date;
  reviewed_at: Date | null;
}

// Connected Account
export interface ConnectedAccount {
  id: string;
  user_id: string;
  account_type: AccountType;
  account_identifier: string;
  display_name: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: Date | null;
  status: AccountStatus;
  last_synced_at: Date | null;
  sync_frequency_hours: number;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

// Bank Transaction
export interface BankTransaction {
  id: string;
  user_id: string;
  connected_account_id: string;
  transaction_id: string;
  transaction_date: Date;
  description: string;
  amount: number;
  currency: string;
  transaction_type: TransactionType;
  category: string | null;
  merchant_name: string | null;
  is_recurring: boolean;
  subscription_id: string | null;
  raw_data: any;
  created_at: Date;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationStatus;
  subscription_id: string | null;
  metadata: any;
  scheduled_for: Date | null;
  sent_at: Date | null;
  read_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

// Budget
export interface Budget {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  category: string | null;
  warning_threshold: number;
  status: BudgetStatus;
  current_spending: number;
  alert_enabled: boolean;
  start_date: Date;
  end_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Subscription Price History
export interface SubscriptionPriceHistory {
  id: string;
  subscription_id: string;
  old_amount: number | null;
  new_amount: number;
  currency: string;
  change_type: PriceChangeType;
  change_percentage: number | null;
  change_reason: string | null;
  effective_date: Date;
  detected_at: Date;
  notified: boolean;
  notified_at: Date | null;
}

// Family Group
export interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  description: string | null;
  max_members: number;
  created_at: Date;
  updated_at: Date;
}

// Family Group Member
export interface FamilyGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: Date;
}

// Family Group Invite
export interface FamilyGroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  invited_email: string;
  invite_token: string;
  status: InviteStatus;
  expires_at: Date;
  created_at: Date;
  responded_at: Date | null;
}

// Shared Subscription
export interface SharedSubscription {
  id: string;
  group_id: string;
  subscription_id: string;
  shared_by: string;
  split_method: string;
  split_data: any;
  shared_at: Date;
}

// Refresh Token
export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  is_revoked: boolean;
  revoked_at: Date | null;
  device_info: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// Cancellation Guide
export interface CancellationGuide {
  id: string;
  service_name: string;
  service_category: string | null;
  difficulty: CancellationDifficulty;
  estimated_time_minutes: number | null;
  cancellation_methods: CancellationMethod[];
  primary_method: CancellationMethod;
  cancellation_url: string | null;
  requires_login: boolean;
  support_email: string | null;
  email_template: string | null;
  support_phone: string | null;
  phone_hours: string | null;
  steps: any;
  warnings: any;
  tips: any;
  refund_policy: string | null;
  refund_eligible_days: number | null;
  pause_available: boolean;
  downgrade_available: boolean;
  last_verified: Date | null;
  success_rate: number | null;
  average_response_time_hours: number | null;
  created_at: Date;
  updated_at: Date;
}

// Cancellation Request
export interface CancellationRequest {
  id: string;
  user_id: string;
  subscription_id: string | null;
  service_name: string;
  method_used: CancellationMethod;
  status: string;
  email_sent_at: Date | null;
  email_subject: string | null;
  email_body: string | null;
  response_received: boolean;
  response_date: Date | null;
  cancelled_successfully: boolean | null;
  cancellation_date: Date | null;
  refund_received: boolean;
  refund_amount: number | null;
  difficulty_rating: number | null;
  feedback_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Migration
export interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}
