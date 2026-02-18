-- Detected subscriptions table for scan results

CREATE TYPE detection_status_type AS ENUM ('pending', 'confirmed', 'rejected', 'imported');
CREATE TYPE detection_source_type AS ENUM ('email', 'bank', 'sms');

CREATE TABLE IF NOT EXISTS detected_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  billing_cycle billing_cycle_type,
  next_billing_date DATE,
  description TEXT,
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- 0.00 to 1.00
  source detection_source_type NOT NULL,
  source_identifier TEXT, -- Email ID, transaction ID, etc.
  raw_data JSONB, -- Store original data for reference
  status detection_status_type DEFAULT 'pending',
  imported_subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_user_id ON detected_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_status ON detected_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_source ON detected_subscriptions(source);
CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_confidence ON detected_subscriptions(confidence_score);
CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_detected_at ON detected_subscriptions(detected_at);
CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_raw_data ON detected_subscriptions USING GIN(raw_data);
