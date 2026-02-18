import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { emailScanQueueEvents, renewalCheckQueueEvents, transactionSyncQueueEvents } from './queue';

/**
 * WebSocket Service
 * Manages WebSocket connections and broadcasts job progress updates
 */

// Store active WebSocket connections by user ID
const connections = new Map<string, Set<WebSocket>>();

/**
 * Register WebSocket routes
 */
export function registerWebSocketRoutes(app: FastifyInstance): void {
  // WebSocket endpoint for job progress updates
  app.get('/ws/jobs/:userId', { websocket: true }, (socket, request) => {
    const { userId } = request.params as { userId: string };

    console.log(`[WebSocket] Client connected for user ${userId}`);

    // Add connection to user's connection set
    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId)!.add(socket);

    // Handle incoming messages (optional - for pings/keepalive)
    socket.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });

    // Handle connection close
    socket.on('close', () => {
      console.log(`[WebSocket] Client disconnected for user ${userId}`);
      const userConnections = connections.get(userId);
      if (userConnections) {
        userConnections.delete(socket);
        if (userConnections.size === 0) {
          connections.delete(userId);
        }
      }
    });

    // Handle errors
    socket.on('error', (error: any) => {
      console.error(`[WebSocket] Error for user ${userId}:`, error);
    });

    // Send initial connection success message
    socket.send(
      JSON.stringify({
        type: 'connected',
        userId,
        timestamp: new Date().toISOString(),
      })
    );
  });

  console.log('✅ WebSocket routes registered');
}

/**
 * Broadcast job progress to user's WebSocket connections
 */
export function broadcastJobProgress(
  userId: string,
  jobId: string,
  queueName: string,
  progress: number,
  data?: any
): void {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'job-progress',
    jobId,
    queueName,
    progress,
    data,
    timestamp: new Date().toISOString(),
  });

  userConnections.forEach((socket) => {
    try {
      socket.send(message);
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
    }
  });
}

/**
 * Broadcast job completion to user's WebSocket connections
 */
export function broadcastJobCompleted(
  userId: string,
  jobId: string,
  queueName: string,
  result: any
): void {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'job-completed',
    jobId,
    queueName,
    result,
    timestamp: new Date().toISOString(),
  });

  userConnections.forEach((socket) => {
    try {
      socket.send(message);
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
    }
  });
}

/**
 * Broadcast job failure to user's WebSocket connections
 */
export function broadcastJobFailed(
  userId: string,
  jobId: string,
  queueName: string,
  error: string
): void {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'job-failed',
    jobId,
    queueName,
    error,
    timestamp: new Date().toISOString(),
  });

  userConnections.forEach((socket) => {
    try {
      socket.send(message);
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
    }
  });
}

/**
 * Initialize queue event listeners for WebSocket broadcasting
 */
export function initializeQueueEventListeners(): void {
  // Email scan queue events
  emailScanQueueEvents.on('progress', ({ jobId, data }) => {
    // Extract userId from job data (would need to be stored in Redis)
    // For now, we'll broadcast to all connections
    console.log(`[Email Scan Queue] Job ${jobId} progress: ${data}%`);
  });

  emailScanQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[Email Scan Queue] Job ${jobId} completed`);
  });

  emailScanQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.log(`[Email Scan Queue] Job ${jobId} failed: ${failedReason}`);
  });

  // Renewal check queue events
  renewalCheckQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[Renewal Check Queue] Job ${jobId} completed`);
  });

  renewalCheckQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.log(`[Renewal Check Queue] Job ${jobId} failed: ${failedReason}`);
  });

  // Transaction sync queue events
  transactionSyncQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[Transaction Sync Queue] Job ${jobId} completed`);
  });

  transactionSyncQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.log(`[Transaction Sync Queue] Job ${jobId} failed: ${failedReason}`);
  });

  console.log('✅ Queue event listeners initialized for WebSocket broadcasting');
}

/**
 * Get count of active connections
 */
export function getConnectionCount(): number {
  let total = 0;
  connections.forEach((set) => {
    total += set.size;
  });
  return total;
}

/**
 * Get active user IDs with connections
 */
export function getActiveUserIds(): string[] {
  return Array.from(connections.keys());
}
