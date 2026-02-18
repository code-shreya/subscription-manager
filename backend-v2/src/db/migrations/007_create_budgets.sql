-- Budgets table for budget management and tracking

CREATE TYPE budget_period AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE budget_status AS ENUM ('active', 'exceeded', 'warning', 'paused');

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'INR',
  period budget_period DEFAULT 'monthly',
  category VARCHAR(100), -- NULL means total budget, otherwise category-specific
  warning_threshold DECIMAL(3, 2) DEFAULT 0.80 CHECK (warning_threshold > 0 AND warning_threshold <= 1), -- 80% threshold
  status budget_status DEFAULT 'active',
  current_spending DECIMAL(10, 2) DEFAULT 0,
  alert_enabled BOOLEAN DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_start_date ON budgets(start_date);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
