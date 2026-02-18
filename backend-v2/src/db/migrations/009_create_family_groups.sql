-- Family groups and shared subscriptions tables

CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Family groups table
CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  max_members INTEGER DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family group members table
CREATE TABLE IF NOT EXISTS family_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family group invites table
CREATE TABLE IF NOT EXISTS family_group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email VARCHAR(255) NOT NULL,
  invite_token VARCHAR(255) NOT NULL UNIQUE,
  status invite_status DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Shared subscriptions table
CREATE TABLE IF NOT EXISTS shared_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  split_method VARCHAR(50) DEFAULT 'equal', -- equal, percentage, custom
  split_data JSONB, -- Store split details for each member
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for family groups
CREATE INDEX IF NOT EXISTS idx_family_groups_owner_id ON family_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_family_group_members_group_id ON family_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_family_group_members_user_id ON family_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_group_invites_group_id ON family_group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_family_group_invites_email ON family_group_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_family_group_invites_token ON family_group_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_shared_subscriptions_group_id ON shared_subscriptions(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_subscriptions_subscription_id ON shared_subscriptions(subscription_id);

-- Unique constraint to prevent duplicate group members
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_group_members_unique
ON family_group_members(group_id, user_id);

-- Triggers
CREATE TRIGGER family_groups_updated_at
BEFORE UPDATE ON family_groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
