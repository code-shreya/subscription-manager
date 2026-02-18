-- Connected accounts table for Gmail, bank, and other integrations

CREATE TYPE account_type AS ENUM ('gmail', 'outlook', 'yahoo', 'imap', 'bank', 'upi');
CREATE TYPE account_status_type AS ENUM ('active', 'disconnected', 'expired', 'error');

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_type account_type NOT NULL,
  account_identifier VARCHAR(255) NOT NULL, -- Email address, bank account number (masked), etc.
  display_name VARCHAR(255),
  access_token_encrypted TEXT, -- Store encrypted access tokens
  refresh_token_encrypted TEXT, -- Store encrypted refresh tokens
  token_expires_at TIMESTAMP WITH TIME ZONE,
  status account_status_type DEFAULT 'active',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_hours INTEGER DEFAULT 24,
  metadata JSONB, -- Store provider-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_type ON connected_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_status ON connected_accounts(status);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_last_synced ON connected_accounts(last_synced_at);

-- Unique constraint to prevent duplicate accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_accounts_unique
ON connected_accounts(user_id, account_type, account_identifier);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER connected_accounts_updated_at
BEFORE UPDATE ON connected_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
