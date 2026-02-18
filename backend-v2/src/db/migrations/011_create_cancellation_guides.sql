-- Cancellation guides table for storing service-specific cancellation instructions

CREATE TYPE cancellation_difficulty AS ENUM ('easy', 'medium', 'hard', 'very_hard');
CREATE TYPE cancellation_method AS ENUM ('online', 'email', 'phone', 'in_app', 'chat');

CREATE TABLE IF NOT EXISTS cancellation_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(255) NOT NULL UNIQUE,
  service_category VARCHAR(100),
  difficulty cancellation_difficulty NOT NULL,
  estimated_time_minutes INTEGER, -- Estimated time to complete cancellation
  cancellation_methods cancellation_method[] NOT NULL, -- Array of available methods
  primary_method cancellation_method NOT NULL,

  -- Online cancellation
  cancellation_url TEXT, -- Direct URL to cancel
  requires_login BOOLEAN DEFAULT TRUE,

  -- Email cancellation
  support_email VARCHAR(255),
  email_template TEXT, -- Template for cancellation email

  -- Phone cancellation
  support_phone VARCHAR(50),
  phone_hours VARCHAR(100), -- e.g., "Mon-Fri 9AM-6PM IST"

  -- Step-by-step instructions
  steps JSONB, -- Array of step objects with title, description, tips

  -- Important notes
  warnings JSONB, -- Array of warnings (e.g., "Cancel before billing date")
  tips JSONB, -- Array of helpful tips

  -- Refund policy
  refund_policy TEXT,
  refund_eligible_days INTEGER, -- Days within which refund is possible

  -- Alternative options
  pause_available BOOLEAN DEFAULT FALSE,
  downgrade_available BOOLEAN DEFAULT FALSE,

  -- Metadata
  last_verified DATE, -- When this guide was last verified
  success_rate DECIMAL(5, 2), -- Percentage of successful cancellations
  average_response_time_hours INTEGER, -- For email/phone methods

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_cancellation_guides_service ON cancellation_guides(service_name);
CREATE INDEX idx_cancellation_guides_difficulty ON cancellation_guides(difficulty);
CREATE INDEX idx_cancellation_guides_category ON cancellation_guides(service_category);

-- Trigger to update updated_at
CREATE TRIGGER cancellation_guides_updated_at
BEFORE UPDATE ON cancellation_guides
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Cancellation requests table (track user cancellation attempts)
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  service_name VARCHAR(255) NOT NULL,

  method_used cancellation_method NOT NULL,
  status VARCHAR(50) DEFAULT 'initiated', -- initiated, pending, completed, failed

  -- Email tracking
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_subject TEXT,
  email_body TEXT,

  -- Response tracking
  response_received BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMP WITH TIME ZONE,

  -- Outcome
  cancelled_successfully BOOLEAN,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  refund_received BOOLEAN DEFAULT FALSE,
  refund_amount DECIMAL(10, 2),

  -- Feedback
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  feedback_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for cancellation requests
CREATE INDEX idx_cancellation_requests_user ON cancellation_requests(user_id);
CREATE INDEX idx_cancellation_requests_subscription ON cancellation_requests(subscription_id);
CREATE INDEX idx_cancellation_requests_status ON cancellation_requests(status);
CREATE INDEX idx_cancellation_requests_date ON cancellation_requests(created_at DESC);

-- Trigger
CREATE TRIGGER cancellation_requests_updated_at
BEFORE UPDATE ON cancellation_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
