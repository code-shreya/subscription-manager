-- Bank transactions table for financial data from bank integrations

CREATE TYPE transaction_type AS ENUM ('debit', 'credit');

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) NOT NULL, -- Bank's transaction ID
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  transaction_type transaction_type NOT NULL,
  category VARCHAR(100),
  merchant_name VARCHAR(255),
  is_recurring BOOLEAN DEFAULT FALSE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL, -- Link to subscription if identified
  raw_data JSONB, -- Store original transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id ON bank_transactions(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_merchant ON bank_transactions(merchant_name);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_is_recurring ON bank_transactions(is_recurring);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_subscription_id ON bank_transactions(subscription_id);

-- Unique constraint to prevent duplicate transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_unique
ON bank_transactions(connected_account_id, transaction_id);
