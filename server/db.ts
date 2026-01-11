import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, servers, Server, InsertServer, 
  serverMetrics, ServerMetric, InsertServerMetric,
  systemLogs, SystemLog, InsertSystemLog,
  processes, Process, InsertProcess,
  alertConfigs, AlertConfig, InsertAlertConfig,
  alerts, Alert, InsertAlert,
  serverPermissions, ServerPermission, InsertServerPermission,
  logAnalysis, LogAnalysis, InsertLogAnalysis,
  apiKeys, ApiKey, InsertApiKey,
  webhookLogs, WebhookLog, InsertWebhookLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== User Management =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

// ===== Server Management =====

export async function createServer(server: InsertServer): Promise<Server> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(servers).values(server);
  
  // Get the most recently created server by this user
  const [newServer] = await db.select().from(servers)
    .where(eq(servers.createdBy, server.createdBy))
    .orderBy(desc(servers.createdAt))
    .limit(1);
    
  if (!newServer) {
    throw new Error("Failed to retrieve created server");
  }
  return newServer;
}

export async function getServerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  return result[0];
}

export async function getAllServers(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // If userId provided, filter by permissions (admins see all)
  if (userId) {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user[0]?.role === 'admin') {
      return await db.select().from(servers).orderBy(desc(servers.createdAt));
    }
    
    // Get servers user has permission to view
    const permissions = await db.select().from(serverPermissions).where(eq(serverPermissions.userId, userId));
    if (permissions.length === 0) return [];
    
    const serverIds = permissions.map(p => p.serverId);
    return await db.select().from(servers).where(inArray(servers.id, serverIds)).orderBy(desc(servers.createdAt));
  }
  
  return await db.select().from(servers).orderBy(desc(servers.createdAt));
}

export async function updateServer(id: number, updates: Partial<InsertServer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(servers).set(updates).where(eq(servers.id, id));
  return await getServerById(id);
}

export async function deleteServer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(servers).where(eq(servers.id, id));
}

// ===== Server Metrics =====

export async function createMetric(metric: InsertServerMetric): Promise<ServerMetric> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(serverMetrics).values(metric);
  
  // Get the most recently created metric for this server
  const [newMetric] = await db.select().from(serverMetrics)
    .where(eq(serverMetrics.serverId, metric.serverId))
    .orderBy(desc(serverMetrics.timestamp))
    .limit(1);
    
  if (!newMetric) {
    throw new Error("Failed to retrieve created metric");
  }
  return newMetric;
}

export async function getLatestMetrics(serverId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serverMetrics)
    .where(eq(serverMetrics.serverId, serverId))
    .orderBy(desc(serverMetrics.timestamp))
    .limit(limit);
}

export async function getMetricsInRange(serverId: number, startTime: Date, endTime: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serverMetrics)
    .where(
      and(
        eq(serverMetrics.serverId, serverId),
        gte(serverMetrics.timestamp, startTime),
        lte(serverMetrics.timestamp, endTime)
      )
    )
    .orderBy(serverMetrics.timestamp);
}

// ===== System Logs =====

export async function createLog(log: InsertSystemLog): Promise<SystemLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(systemLogs).values(log);
  
  // Get the most recently created log for this server
  const [newLog] = await db.select().from(systemLogs)
    .where(eq(systemLogs.serverId, log.serverId))
    .orderBy(desc(systemLogs.timestamp))
    .limit(1);
    
  if (!newLog) {
    throw new Error("Failed to retrieve created log");
  }
  return newLog;
}

export async function getServerLogs(serverId: number, limit: number = 100, level?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(systemLogs.serverId, serverId)];
  if (level) {
    conditions.push(eq(systemLogs.level, level as any));
  }
  
  return await db.select().from(systemLogs)
    .where(and(...conditions))
    .orderBy(desc(systemLogs.timestamp))
    .limit(limit);
}

export async function searchLogs(serverId: number, searchTerm: string, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(systemLogs)
    .where(
      and(
        eq(systemLogs.serverId, serverId),
        sql`${systemLogs.message} LIKE ${`%${searchTerm}%`}`
      )
    )
    .orderBy(desc(systemLogs.timestamp))
    .limit(limit);
}

// ===== Processes =====

export async function upsertProcesses(processList: InsertProcess[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const proc of processList) {
    await db.insert(processes).values(proc).onDuplicateKeyUpdate({
      set: {
        name: proc.name,
        cpuUsage: proc.cpuUsage,
        ramUsage: proc.ramUsage,
        status: proc.status,
        timestamp: new Date(),
      }
    });
  }
}

export async function getServerProcesses(serverId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get latest processes for server
  return await db.select().from(processes)
    .where(eq(processes.serverId, serverId))
    .orderBy(desc(processes.cpuUsage));
}

// ===== Alert Configs =====

export async function createAlertConfig(config: InsertAlertConfig): Promise<AlertConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(alertConfigs).values(config);
  
  // Get the most recently created config for this server
  const [newConfig] = await db.select().from(alertConfigs)
    .where(eq(alertConfigs.serverId, config.serverId))
    .orderBy(desc(alertConfigs.createdAt))
    .limit(1);
    
  if (!newConfig) {
    throw new Error("Failed to retrieve created alert config");
  }
  return newConfig;
}

export async function getServerAlertConfigs(serverId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(alertConfigs).where(eq(alertConfigs.serverId, serverId));
}

export async function updateAlertConfig(id: number, updates: Partial<InsertAlertConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(alertConfigs).set(updates).where(eq(alertConfigs.id, id));
}

export async function deleteAlertConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(alertConfigs).where(eq(alertConfigs.id, id));
}

// ===== Alerts =====

export async function createAlert(alert: InsertAlert): Promise<Alert> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(alerts).values(alert);
  
  // Get the most recently created alert for this server
  const [newAlert] = await db.select().from(alerts)
    .where(eq(alerts.serverId, alert.serverId))
    .orderBy(desc(alerts.createdAt))
    .limit(1);
    
  if (!newAlert) {
    throw new Error("Failed to retrieve created alert");
  }
  return newAlert;
}

export async function getServerAlerts(serverId: number, includeAcknowledged: boolean = false) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(alerts.serverId, serverId)];
  if (!includeAcknowledged) {
    conditions.push(eq(alerts.acknowledged, false));
  }
  
  return await db.select().from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.createdAt));
}

export async function acknowledgeAlert(alertId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(alerts).set({
    acknowledged: true,
    acknowledgedBy: userId,
    acknowledgedAt: new Date(),
  }).where(eq(alerts.id, alertId));
}

// ===== Server Permissions =====

export async function grantServerPermission(permission: InsertServerPermission): Promise<ServerPermission> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(serverPermissions).values(permission);
  
  // Get the most recently granted permission for this user and server
  const [newPerm] = await db.select().from(serverPermissions)
    .where(
      and(
        eq(serverPermissions.userId, permission.userId),
        eq(serverPermissions.serverId, permission.serverId)
      )
    )
    .orderBy(desc(serverPermissions.grantedAt))
    .limit(1);
    
  if (!newPerm) {
    throw new Error("Failed to retrieve granted permission");
  }
  return newPerm;
}

export async function getUserServerPermissions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serverPermissions).where(eq(serverPermissions.userId, userId));
}

export async function revokeServerPermission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(serverPermissions).where(eq(serverPermissions.id, id));
}

// ===== Log Analysis =====

export async function createLogAnalysis(analysis: InsertLogAnalysis): Promise<LogAnalysis> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(logAnalysis).values(analysis);
  
  // Get the most recently created analysis for this server
  const [newAnalysis] = await db.select().from(logAnalysis)
    .where(eq(logAnalysis.serverId, analysis.serverId))
    .orderBy(desc(logAnalysis.createdAt))
    .limit(1);
    
  if (!newAnalysis) {
    throw new Error("Failed to retrieve created log analysis");
  }
  return newAnalysis;
}

export async function getServerLogAnalysis(serverId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(logAnalysis)
    .where(eq(logAnalysis.serverId, serverId))
    .orderBy(desc(logAnalysis.createdAt))
    .limit(limit);
}

// ===== API Keys =====

export async function createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(apiKeys).values(apiKey);
  const created = await db.select().from(apiKeys).where(eq(apiKeys.key, apiKey.key)).limit(1);
  return created[0]!;
}

export async function getApiKeyByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
  return result[0];
}

export async function getApiKeyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  return result[0];
}

export async function getApiKeysByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function updateApiKey(id: number, updates: Partial<InsertApiKey>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id));
  return await getApiKeyById(id);
}

export async function deleteApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(apiKeys).where(eq(apiKeys.id, id));
}

// ===== Webhook Logs =====

export async function createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(webhookLogs).values(log);
  const created = await db.select().from(webhookLogs).orderBy(desc(webhookLogs.id)).limit(1);
  return created[0]!;
}

export async function getWebhookLogsByUserId(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(webhookLogs)
    .where(eq(webhookLogs.userId, userId))
    .orderBy(desc(webhookLogs.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
