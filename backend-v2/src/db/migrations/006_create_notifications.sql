-- Notifications table for managing user notifications

CREATE TYPE notification_type AS ENUM (
  'renewal_reminder',
  'price_change',
  'payment_failed',
  'budget_exceeded',
  'budget_warning',
  'new_detection',
  'subscription_expired',
  'family_invite'
);

CREATE TYPE notification_channel AS ENUM ('email', 'push', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status notification_status DEFAULT 'pending',
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  metadata JSONB, -- Store additional data (budget_id, detection_id, etc.)
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_subscription_id ON notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
