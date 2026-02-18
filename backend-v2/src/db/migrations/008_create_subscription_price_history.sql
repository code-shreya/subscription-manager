-- Subscription price history table for tracking price changes over time

CREATE TYPE price_change_type AS ENUM ('increase', 'decrease', 'no_change');

CREATE TABLE IF NOT EXISTS subscription_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  old_amount DECIMAL(10, 2),
  new_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  change_type price_change_type NOT NULL,
  change_percentage DECIMAL(5, 2), -- Percentage change (can be negative)
  change_reason TEXT, -- Optional reason for price change
  effective_date DATE NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_price_history_subscription_id ON subscription_price_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_price_history_effective_date ON subscription_price_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_price_history_change_type ON subscription_price_history(change_type);
CREATE INDEX IF NOT EXISTS idx_price_history_detected_at ON subscription_price_history(detected_at);
