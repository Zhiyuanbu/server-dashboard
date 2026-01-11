import { createHmac } from 'crypto';
import * as db from './db';
import { TRPCError } from '@trpc/server';

export interface WebhookEvent {
  id: string;
  timestamp: Date;
  action: 'create_server' | 'start_server' | 'stop_server' | 'restart_server' | 'delete_server' | 'update_metrics';
  serverId?: number;
  data: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
}

export interface WebhookPayload {
  action: string;
  serverId?: number;
  data: Record<string, any>;
  timestamp: number;
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

/**
 * Generate webhook signature for outgoing webhooks
 */
export function generateWebhookSignature(
  payload: Record<string, any>,
  secret: string
): string {
  const payloadString = JSON.stringify(payload);
  return createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

/**
 * Process webhook event for server creation
 */
export async function handleCreateServer(
  data: {
    name: string;
    hostname: string;
    ipAddress: string;
    port?: number;
    os?: string;
    osVersion?: string;
    userId: number;
  },
  userId: number
): Promise<any> {
  try {
    // Validate required fields
    if (!data.name || !data.hostname || !data.ipAddress) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Missing required fields: name, hostname, ipAddress',
      });
    }

    // Create server in database
    const server = await db.createServer({
      name: data.name,
      hostname: data.hostname,
      ipAddress: data.ipAddress,
      port: data.port || 22,
      os: data.os || 'Linux',
      osVersion: data.osVersion || 'Unknown',
      status: 'online',
      createdBy: userId,
      lastSeen: new Date(),
    });

    // Initialize metrics for the new server
    await db.createMetric({
      serverId: server.id,
      cpuUsage: 0,
      ramUsage: 0,
      ramUsagePercent: 0,
      diskUsage: 0,
      diskUsagePercent: 0,
      networkIn: 0,
      networkOut: 0,
      activeConnections: 0,
      timestamp: new Date(),
    });

    return {
      success: true,
      server,
      message: `Server ${data.name} created successfully`,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process webhook event for server deletion
 */
export async function handleDeleteServer(
  serverId: number,
  userId: number
): Promise<any> {
  try {
    const server = await db.getServerById(serverId);
    if (!server) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Server not found',
      });
    }

    if (server.createdBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this server',
      });
    }

    await db.deleteServer(serverId);

    return {
      success: true,
      message: `Server ${server.name} deleted successfully`,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process webhook event for server status change
 */
export async function handleServerStatusChange(
  serverId: number,
  action: 'start' | 'stop' | 'restart',
  userId: number
): Promise<any> {
  try {
    const server = await db.getServerById(serverId);
    if (!server) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Server not found',
      });
    }

    if (server.createdBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage this server',
      });
    }

    let newStatus = server.status;
    switch (action) {
      case 'start':
        newStatus = 'online';
        break;
      case 'stop':
        newStatus = 'offline';
        break;
      case 'restart':
        newStatus = 'online';
        break;
    }

    const updatedServer = await db.updateServer(serverId, {
      status: newStatus,
      lastSeen: new Date(),
    });

    return {
      success: true,
      server: updatedServer,
      message: `Server ${action} completed successfully`,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process webhook event for metrics update
 */
export async function handleMetricsUpdate(
  serverId: number,
  metrics: {
    cpuUsage: number;
    ramUsage: number;
    ramUsagePercent: number;
    diskUsage: number;
    diskUsagePercent: number;
    networkIn: number;
    networkOut: number;
    activeConnections: number;
  },
  userId: number
): Promise<any> {
  try {
    const server = await db.getServerById(serverId);
    if (!server) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Server not found',
      });
    }

    if (server.createdBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this server',
      });
    }

    // Validate metrics
    if (
      metrics.cpuUsage < 0 ||
      metrics.cpuUsage > 100 ||
      metrics.ramUsagePercent < 0 ||
      metrics.ramUsagePercent > 100 ||
      metrics.diskUsagePercent < 0 ||
      metrics.diskUsagePercent > 100
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid metrics values',
      });
    }

    // Store metrics
    const metric = await db.createMetric({
      serverId,
      ...metrics,
      timestamp: new Date(),
    });

    // Update server last seen
    await db.updateServer(serverId, {
      lastSeen: new Date(),
    });

    // Check for alerts
    const alerts = [];
    if (metrics.cpuUsage > 90) {
      alerts.push({
        serverId,
        severity: 'critical',
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
      });
    }
    if (metrics.ramUsagePercent > 90) {
      alerts.push({
        serverId,
        severity: 'critical',
        message: `High memory usage: ${metrics.ramUsagePercent.toFixed(1)}%`,
      });
    }
    if (metrics.diskUsagePercent > 90) {
      alerts.push({
        serverId,
        severity: 'critical',
        message: `Low disk space: ${(100 - metrics.diskUsagePercent).toFixed(1)}% free`,
      });
    }

    // Create alerts if thresholds exceeded
    for (const alert of alerts) {
      await db.createAlert({
        serverId: alert.serverId,
        severity: alert.severity as any,
        message: alert.message,
        acknowledged: false,
        createdAt: new Date(),
      } as any);
    }

    return {
      success: true,
      metric,
      alerts,
      message: 'Metrics updated successfully',
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process incoming webhook
 */
export async function processWebhook(
  payload: WebhookPayload,
  userId: number
): Promise<any> {
  try {
    switch (payload.action) {
      case 'create_server':
        return await handleCreateServer(payload.data as any, userId);

      case 'delete_server':
        if (!payload.serverId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'serverId is required for delete_server action',
          });
        }
        return await handleDeleteServer(payload.serverId, userId);

      case 'start_server':
      case 'stop_server':
      case 'restart_server':
        if (!payload.serverId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'serverId is required for server control actions',
          });
        }
        const action = payload.action.replace('_server', '') as 'start' | 'stop' | 'restart';
        return await handleServerStatusChange(payload.serverId, action, userId);

      case 'update_metrics':
        if (!payload.serverId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'serverId is required for update_metrics action',
          });
        }
        return await handleMetricsUpdate(payload.serverId, payload.data as any, userId);

      default:
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unknown action: ${payload.action}`,
        });
    }
  } catch (error) {
    throw error;
  }
}
