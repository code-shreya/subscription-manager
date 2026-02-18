-- Subscriptions table for active user subscriptions

CREATE TYPE billing_cycle_type AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time');
CREATE TYPE subscription_status_type AS ENUM ('active', 'cancelled', 'expired', 'paused');
CREATE TYPE subscription_source_type AS ENUM ('manual', 'email', 'bank', 'sms');

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  billing_cycle billing_cycle_type DEFAULT 'monthly',
  next_billing_date DATE,
  status subscription_status_type DEFAULT 'active',
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  reminder_days_before INTEGER DEFAULT 3,
  source subscription_source_type DEFAULT 'manual',
  notes TEXT,
  tags TEXT[], -- Array of tags for categorization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tags ON subscriptions USING GIN(tags);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
