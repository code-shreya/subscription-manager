import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { familyService } from './family.service';
import { z } from 'zod';

// Validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default('INR'),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

const shareSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  splitMethod: z.enum(['equal', 'percentage', 'custom']).default('equal'),
  splitData: z.record(z.string(), z.number()).optional(),
});

/**
 * Family group routes
 */
export async function familyRoutes(fastify: FastifyInstance) {
  // Create a new family group
  fastify.post('/family/groups', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = createGroupSchema.parse(request.body);

    const group = await familyService.createGroup(userId, body);
    return reply.status(201).send(group);
  });

  // Get user's family groups
  fastify.get('/family/groups', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const groups = await familyService.getUserGroups(userId);
    return reply.send(groups);
  });

  // Get group details
  fastify.get('/family/groups/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;

    const group = await familyService.getGroup(id, userId);
    return reply.send(group);
  });

  // Update group
  fastify.put('/family/groups/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;
    const updates = updateGroupSchema.parse(request.body);

    const group = await familyService.updateGroup(id, userId, updates);
    return reply.send(group);
  });

  // Delete group
  fastify.delete('/family/groups/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;

    await familyService.deleteGroup(id, userId);
    return reply.status(204).send();
  });

  // Get group members
  fastify.get('/family/groups/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;

    const members = await familyService.getGroupMembers(id, userId);
    return reply.send(members);
  });

  // Invite user to group
  fastify.post('/family/groups/:id/invite', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;
    const body = inviteUserSchema.parse(request.body);

    const invite = await familyService.inviteUser(id, userId, body.email);
    return reply.status(201).send(invite);
  });

  // Get user's invites
  fastify.get('/family/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    const userEmail = (request as any).userEmail;
    const invites = await familyService.getUserInvites(userEmail);
    return reply.send(invites);
  });

  // Accept invite
  fastify.post('/family/invites/:token/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { token } = request.params as any;

    const membership = await familyService.acceptInvite(token, userId);
    return reply.send(membership);
  });

  // Decline invite
  fastify.post('/family/invites/:token/decline', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as any;

    await familyService.declineInvite(token);
    return reply.status(204).send();
  });

  // Leave group
  fastify.post('/family/groups/:id/leave', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;

    await familyService.leaveGroup(id, userId);
    return reply.status(204).send();
  });

  // Share subscription with group
  fastify.post('/family/groups/:id/share', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;
    const body = shareSubscriptionSchema.parse(request.body);

    const sharedSub = await familyService.shareSubscription(
      body.subscriptionId,
      id,
      userId,
      body.splitMethod,
      body.splitData
    );
    return reply.status(201).send(sharedSub);
  });

  // Get shared subscriptions for group
  fastify.get('/family/groups/:id/subscriptions', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;

    const subscriptions = await familyService.getGroupSharedSubscriptions(id, userId);
    return reply.send(subscriptions);
  });

  // Unshare subscription
  fastify.delete('/family/shared/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as any;

    await familyService.unshareSubscription(id, userId);
    return reply.status(204).send();
  });

  // Get user's cost split summary
  fastify.get('/family/cost-split', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const costSplit = await familyService.getUserCostSplit(userId);
    return reply.send(costSplit);
  });
}
