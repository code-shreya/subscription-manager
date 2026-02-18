import { db } from '../../config/database';
import {
  FamilyGroup,
  FamilyGroupMember,
  FamilyGroupInvite,
  SharedSubscription,
  MemberRole,
} from '../../db/types';
import crypto from 'crypto';

/**
 * Family Service
 * Manages family groups, invites, and shared subscriptions
 */
export class FamilyService {
  /**
   * Create a new family group
   */
  async createGroup(
    userId: string,
    data: { name: string; description?: string; maxMembers?: number }
  ): Promise<FamilyGroup> {
    const { name, description, maxMembers = 6 } = data;

    // Create group
    const groupResult = await db.query<FamilyGroup>(
      `INSERT INTO family_groups (name, owner_id, description, max_members)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, userId, description || null, maxMembers]
    );

    const group = groupResult.rows[0];

    // Add owner as admin member
    await db.query(
      `INSERT INTO family_group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [group.id, userId]
    );

    return group;
  }

  /**
   * Get user's family groups
   */
  async getUserGroups(userId: string): Promise<
    Array<
      FamilyGroup & {
        memberCount: number;
        role: MemberRole;
        sharedSubscriptionsCount: number;
      }
    >
  > {
    const result = await db.query<
      FamilyGroup & { member_count: number; role: MemberRole; shared_subscriptions_count: number }
    >(
      `SELECT
        fg.*,
        fgm.role,
        (SELECT COUNT(*) FROM family_group_members WHERE group_id = fg.id) as member_count,
        (SELECT COUNT(*) FROM shared_subscriptions WHERE group_id = fg.id) as shared_subscriptions_count
       FROM family_groups fg
       JOIN family_group_members fgm ON fg.id = fgm.group_id
       WHERE fgm.user_id = $1
       ORDER BY fg.created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      ...row,
      memberCount: parseInt(row.member_count as any, 10),
      sharedSubscriptionsCount: parseInt(row.shared_subscriptions_count as any, 10),
    }));
  }

  /**
   * Get family group details
   */
  async getGroup(groupId: string, userId: string): Promise<FamilyGroup | null> {
    // Verify user is a member
    const memberCheck = await db.query(
      `SELECT 1 FROM family_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return null;
    }

    const result = await db.query<FamilyGroup>(
      `SELECT * FROM family_groups WHERE id = $1`,
      [groupId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update family group
   */
  async updateGroup(
    groupId: string,
    userId: string,
    updates: { name?: string; description?: string; maxMembers?: number }
  ): Promise<FamilyGroup> {
    // Verify user is owner or admin
    const roleCheck = await db.query<{ role: MemberRole }>(
      `SELECT role FROM family_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (roleCheck.rows.length === 0 || !['owner', 'admin'].includes(roleCheck.rows[0].role)) {
      throw new Error('Insufficient permissions');
    }

    const fields: string[] = [];
    const values: any[] = [groupId];
    let paramIndex = 2;

    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.maxMembers) {
      fields.push(`max_members = $${paramIndex++}`);
      values.push(updates.maxMembers);
    }

    if (fields.length === 0) {
      const group = await this.getGroup(groupId, userId);
      if (!group) throw new Error('Group not found');
      return group;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE family_groups
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query<FamilyGroup>(query, values);
    return result.rows[0];
  }

  /**
   * Delete family group
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    // Verify user is owner
    const group = await db.query<FamilyGroup>(
      `SELECT * FROM family_groups WHERE id = $1 AND owner_id = $2`,
      [groupId, userId]
    );

    if (group.rows.length === 0) {
      throw new Error('Only owner can delete group');
    }

    await db.query(`DELETE FROM family_groups WHERE id = $1`, [groupId]);
  }

  /**
   * Get group members
   */
  async getGroupMembers(
    groupId: string,
    userId: string
  ): Promise<Array<{ id: string; email: string; name: string; role: MemberRole; joinedAt: Date }>> {
    // Verify user is a member
    const memberCheck = await db.query(
      `SELECT 1 FROM family_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('Not a member of this group');
    }

    const result = await db.query<{
      id: string;
      email: string;
      name: string;
      role: MemberRole;
      joined_at: Date;
    }>(
      `SELECT u.id, u.email, u.name, fgm.role, fgm.joined_at
       FROM family_group_members fgm
       JOIN users u ON fgm.user_id = u.id
       WHERE fgm.group_id = $1
       ORDER BY fgm.joined_at ASC`,
      [groupId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name || '',
      role: row.role,
      joinedAt: row.joined_at,
    }));
  }

  /**
   * Invite user to family group
   */
  async inviteUser(
    groupId: string,
    invitedBy: string,
    invitedEmail: string
  ): Promise<FamilyGroupInvite> {
    // Verify inviter is admin or owner
    const roleCheck = await db.query<{ role: MemberRole }>(
      `SELECT role FROM family_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, invitedBy]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role === 'member') {
      throw new Error('Only admins and owners can invite members');
    }

    // Check group capacity
    const group = await db.query<FamilyGroup>(`SELECT * FROM family_groups WHERE id = $1`, [
      groupId,
    ]);

    if (group.rows.length === 0) {
      throw new Error('Group not found');
    }

    const memberCount = await db.query(
      `SELECT COUNT(*) as count FROM family_group_members WHERE group_id = $1`,
      [groupId]
    );

    if (parseInt(memberCount.rows[0].count, 10) >= group.rows[0].max_members) {
      throw new Error('Group is at maximum capacity');
    }

    // Check if user already invited or member
    const existingInvite = await db.query(
      `SELECT 1 FROM family_group_invites
       WHERE group_id = $1 AND invited_email = $2 AND status = 'pending'`,
      [groupId, invitedEmail]
    );

    if (existingInvite.rows.length > 0) {
      throw new Error('User already invited');
    }

    // Check if user already a member
    const existingMember = await db.query(
      `SELECT 1 FROM family_group_members fgm
       JOIN users u ON fgm.user_id = u.id
       WHERE fgm.group_id = $1 AND u.email = $2`,
      [groupId, invitedEmail]
    );

    if (existingMember.rows.length > 0) {
      throw new Error('User already a member');
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const result = await db.query<FamilyGroupInvite>(
      `INSERT INTO family_group_invites (group_id, invited_by, invited_email, invite_token, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, invitedBy, invitedEmail, inviteToken, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Get pending invites for a user
   */
  async getUserInvites(userEmail: string): Promise<
    Array<
      FamilyGroupInvite & {
        groupName: string;
        invitedByName: string;
        memberCount: number;
      }
    >
  > {
    const result = await db.query<
      FamilyGroupInvite & { group_name: string; invited_by_name: string; member_count: number }
    >(
      `SELECT
        fgi.*,
        fg.name as group_name,
        u.name as invited_by_name,
        (SELECT COUNT(*) FROM family_group_members WHERE group_id = fg.id) as member_count
       FROM family_group_invites fgi
       JOIN family_groups fg ON fgi.group_id = fg.id
       JOIN users u ON fgi.invited_by = u.id
       WHERE fgi.invited_email = $1 AND fgi.status = 'pending' AND fgi.expires_at > NOW()
       ORDER BY fgi.created_at DESC`,
      [userEmail]
    );

    return result.rows.map((row) => ({
      ...row,
      groupName: row.group_name,
      invitedByName: row.invited_by_name || '',
      memberCount: parseInt(row.member_count as any, 10),
    }));
  }

  /**
   * Accept invite
   */
  async acceptInvite(inviteToken: string, userId: string): Promise<FamilyGroupMember> {
    // Get invite
    const inviteResult = await db.query<FamilyGroupInvite>(
      `SELECT * FROM family_group_invites WHERE invite_token = $1`,
      [inviteToken]
    );

    if (inviteResult.rows.length === 0) {
      throw new Error('Invite not found');
    }

    const invite = inviteResult.rows[0];

    if (invite.status !== 'pending') {
      throw new Error('Invite already responded to');
    }

    if (new Date() > invite.expires_at) {
      await db.query(
        `UPDATE family_group_invites SET status = 'expired' WHERE id = $1`,
        [invite.id]
      );
      throw new Error('Invite expired');
    }

    // Verify user email matches invite
    const user = await db.query<{ email: string }>(`SELECT email FROM users WHERE id = $1`, [
      userId,
    ]);

    if (user.rows.length === 0 || user.rows[0].email !== invite.invited_email) {
      throw new Error('Invite is for different email');
    }

    // Add user to group
    const memberResult = await db.query<FamilyGroupMember>(
      `INSERT INTO family_group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')
       RETURNING *`,
      [invite.group_id, userId]
    );

    // Update invite status
    await db.query(
      `UPDATE family_group_invites
       SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [invite.id]
    );

    return memberResult.rows[0];
  }

  /**
   * Decline invite
   */
  async declineInvite(inviteToken: string): Promise<void> {
    const result = await db.query(
      `UPDATE family_group_invites
       SET status = 'declined', responded_at = CURRENT_TIMESTAMP
       WHERE invite_token = $1 AND status = 'pending'
       RETURNING id`,
      [inviteToken]
    );

    if (result.rowCount === 0) {
      throw new Error('Invite not found or already responded to');
    }
  }

  /**
   * Leave family group
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    // Check if user is owner
    const group = await db.query<FamilyGroup>(
      `SELECT * FROM family_groups WHERE id = $1`,
      [groupId]
    );

    if (group.rows.length === 0) {
      throw new Error('Group not found');
    }

    if (group.rows[0].owner_id === userId) {
      throw new Error('Owner cannot leave group. Transfer ownership or delete group instead.');
    }

    const result = await db.query(
      `DELETE FROM family_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Not a member of this group');
    }
  }

  /**
   * Share subscription with group
   */
  async shareSubscription(
    subscriptionId: string,
    groupId: string,
    userId: string,
    splitMethod: 'equal' | 'percentage' | 'custom' = 'equal',
    splitData?: any
  ): Promise<SharedSubscription> {
    // Verify user is a member
    const memberCheck = await db.query(
      `SELECT 1 FROM family_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('Not a member of this group');
    }

    // Verify subscription belongs to user
    const subCheck = await db.query(
      `SELECT 1 FROM subscriptions WHERE id = $1 AND user_id = $2`,
      [subscriptionId, userId]
    );

    if (subCheck.rows.length === 0) {
      throw new Error('Subscription not found');
    }

    // Check if already shared
    const existingShare = await db.query(
      `SELECT 1 FROM shared_subscriptions WHERE subscription_id = $1 AND group_id = $2`,
      [subscriptionId, groupId]
    );

    if (existingShare.rows.length > 0) {
      throw new Error('Subscription already shared with this group');
    }

    const result = await db.query<SharedSubscription>(
      `INSERT INTO shared_subscriptions (group_id, subscription_id, shared_by, split_method, split_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, subscriptionId, userId, splitMethod, splitData ? JSON.stringify(splitData) : null]
    );

    return result.rows[0];
  }

  /**
   * Get shared subscriptions for a group
   */
  async getGroupSharedSubscriptions(groupId: string, userId: string): Promise<
    Array<{
      id: string;
      subscription: {
        id: string;
        name: string;
        category: string;
        amount: number;
        currency: string;
        billingCycle: string;
      };
      sharedBy: {
        id: string;
        name: string;
        email: string;
      };
      splitMethod: string;
      splitData: any;
      costPerMember: number;
      sharedAt: Date;
    }>
  > {
    // Verify user is a member
    const memberCheck = await db.query(
      `SELECT 1 FROM family_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('Not a member of this group');
    }

    const result = await db.query<{
      id: string;
      subscription_id: string;
      subscription_name: string;
      subscription_category: string;
      subscription_amount: number;
      subscription_currency: string;
      subscription_billing_cycle: string;
      shared_by_id: string;
      shared_by_name: string;
      shared_by_email: string;
      split_method: string;
      split_data: any;
      shared_at: Date;
      member_count: number;
    }>(
      `SELECT
        ss.id,
        s.id as subscription_id,
        s.name as subscription_name,
        s.category as subscription_category,
        s.amount as subscription_amount,
        s.currency as subscription_currency,
        s.billing_cycle as subscription_billing_cycle,
        u.id as shared_by_id,
        u.name as shared_by_name,
        u.email as shared_by_email,
        ss.split_method,
        ss.split_data,
        ss.shared_at,
        (SELECT COUNT(*) FROM family_group_members WHERE group_id = ss.group_id) as member_count
       FROM shared_subscriptions ss
       JOIN subscriptions s ON ss.subscription_id = s.id
       JOIN users u ON ss.shared_by = u.id
       WHERE ss.group_id = $1
       ORDER BY ss.shared_at DESC`,
      [groupId]
    );

    return result.rows.map((row) => {
      const memberCount = parseInt(row.member_count as any, 10);
      const amount = parseFloat(row.subscription_amount as any);
      let costPerMember = amount / memberCount;

      if (row.split_method === 'custom' && row.split_data) {
        // For custom splits, calculate user's share
        const userShare = row.split_data[userId];
        if (userShare) {
          costPerMember = userShare;
        }
      }

      return {
        id: row.id,
        subscription: {
          id: row.subscription_id,
          name: row.subscription_name,
          category: row.subscription_category,
          amount,
          currency: row.subscription_currency,
          billingCycle: row.subscription_billing_cycle,
        },
        sharedBy: {
          id: row.shared_by_id,
          name: row.shared_by_name || '',
          email: row.shared_by_email,
        },
        splitMethod: row.split_method,
        splitData: row.split_data,
        costPerMember: Math.round(costPerMember * 100) / 100,
        sharedAt: row.shared_at,
      };
    });
  }

  /**
   * Unshare subscription
   */
  async unshareSubscription(sharedSubscriptionId: string, userId: string): Promise<void> {
    // Verify user is the one who shared it or is admin/owner
    const result = await db.query(
      `DELETE FROM shared_subscriptions
       WHERE id = $1 AND (
         shared_by = $2 OR
         group_id IN (
           SELECT group_id FROM family_group_members
           WHERE user_id = $2 AND role IN ('admin', 'owner')
         )
       )
       RETURNING id`,
      [sharedSubscriptionId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Cannot unshare this subscription');
    }
  }

  /**
   * Calculate cost split for user across all groups
   */
  async getUserCostSplit(userId: string): Promise<{
    totalSavings: number;
    totalCostAfterSplit: number;
    sharedSubscriptions: Array<{
      groupName: string;
      subscriptionName: string;
      originalCost: number;
      costAfterSplit: number;
      savings: number;
      currency: string;
    }>;
  }> {
    const groups = await this.getUserGroups(userId);

    let totalSavings = 0;
    let totalCostAfterSplit = 0;
    const sharedSubscriptions: any[] = [];

    for (const group of groups) {
      const subscriptions = await this.getGroupSharedSubscriptions(group.id, userId);

      for (const sub of subscriptions) {
        const originalCost = sub.subscription.amount;
        const costAfterSplit = sub.costPerMember;
        const savings = originalCost - costAfterSplit;

        totalSavings += savings;
        totalCostAfterSplit += costAfterSplit;

        sharedSubscriptions.push({
          groupName: group.name,
          subscriptionName: sub.subscription.name,
          originalCost,
          costAfterSplit,
          savings,
          currency: sub.subscription.currency,
        });
      }
    }

    return {
      totalSavings: Math.round(totalSavings * 100) / 100,
      totalCostAfterSplit: Math.round(totalCostAfterSplit * 100) / 100,
      sharedSubscriptions,
    };
  }
}

// Export singleton instance
export const familyService = new FamilyService();
