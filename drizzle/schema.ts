import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, bigint, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Servers being monitored
 */
export const servers = mysqlTable("servers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
  port: int("port").default(22).notNull(),
  status: mysqlEnum("status", ["online", "offline", "warning", "error"]).default("offline").notNull(),
  os: varchar("os", { length: 100 }),
  osVersion: varchar("osVersion", { length: 100 }),
  kernelVersion: varchar("kernelVersion", { length: 100 }),
  cpuModel: text("cpuModel"),
  cpuCores: int("cpuCores"),
  totalRam: bigint("totalRam", { mode: "number" }), // in bytes
  totalDisk: bigint("totalDisk", { mode: "number" }), // in bytes
  uptime: bigint("uptime", { mode: "number" }), // in seconds
  lastSeen: timestamp("lastSeen"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").notNull(),
}, (table) => ({
  createdByIdx: index("createdByIdx").on(table.createdBy),
}));

export type Server = typeof servers.$inferSelect;
export type InsertServer = typeof servers.$inferInsert;

/**
 * Real-time and historical server metrics
 */
export const serverMetrics = mysqlTable("serverMetrics", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  cpuUsage: float("cpuUsage").notNull(), // percentage 0-100
  ramUsage: bigint("ramUsage", { mode: "number" }).notNull(), // bytes used
  ramUsagePercent: float("ramUsagePercent").notNull(), // percentage 0-100
  diskUsage: bigint("diskUsage", { mode: "number" }).notNull(), // bytes used
  diskUsagePercent: float("diskUsagePercent").notNull(), // percentage 0-100
  networkIn: bigint("networkIn", { mode: "number" }).default(0).notNull(), // bytes received
  networkOut: bigint("networkOut", { mode: "number" }).default(0).notNull(), // bytes sent
  activeConnections: int("activeConnections").default(0).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  serverIdIdx: index("serverIdIdx").on(table.serverId),
  timestampIdx: index("timestampIdx").on(table.timestamp),
}));

export type ServerMetric = typeof serverMetrics.$inferSelect;
export type InsertServerMetric = typeof serverMetrics.$inferInsert;

/**
 * System logs from servers
 */
export const systemLogs = mysqlTable("systemLogs", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  level: mysqlEnum("level", ["info", "warning", "error", "critical"]).notNull(),
  source: varchar("source", { length: 255 }), // service/process name
  message: text("message").notNull(),
  details: text("details"), // JSON string for additional context
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  serverIdIdx: index("serverIdIdx").on(table.serverId),
  levelIdx: index("levelIdx").on(table.level),
  timestampIdx: index("timestampIdx").on(table.timestamp),
}));

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = typeof systemLogs.$inferInsert;

/**
 * Running processes on servers
 */
export const processes = mysqlTable("processes", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  pid: int("pid").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  user: varchar("user", { length: 100 }),
  cpuUsage: float("cpuUsage").default(0).notNull(),
  ramUsage: bigint("ramUsage", { mode: "number" }).default(0).notNull(), // in bytes
  status: mysqlEnum("status", ["running", "sleeping", "stopped", "zombie"]).default("running").notNull(),
  command: text("command"),
  startTime: timestamp("startTime"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  serverIdIdx: index("serverIdIdx").on(table.serverId),
  pidIdx: index("pidIdx").on(table.serverId, table.pid),
}));

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;

/**
 * Alert thresholds and configurations
 */
export const alertConfigs = mysqlTable("alertConfigs", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  metricType: mysqlEnum("metricType", ["cpu", "ram", "disk", "network"]).notNull(),
  threshold: float("threshold").notNull(), // percentage or value
  operator: mysqlEnum("operator", ["greater", "less", "equal"]).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  emailRecipients: text("emailRecipients"), // JSON array of email addresses
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  serverIdIdx: index("serverIdIdx").on(table.serverId),
}));

export type AlertConfig = typeof alertConfigs.$inferSelect;
export type InsertAlertConfig = typeof alertConfigs.$inferInsert;

/**
 * Alert history and notifications
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  alertConfigId: int("alertConfigId").notNull(),
  metricType: mysqlEnum("metricType", ["cpu", "ram", "disk", "network"]).notNull(),
  currentValue: float("currentValue").notNull(),
  threshold: float("threshold").notNull(),
  severity: mysqlEnum("severity", ["warning", "critical"]).notNull(),
  message: text("message").notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  emailSent: boolean("emailSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  serverIdIdx: index("serverIdIdx").on(table.serverId),
  acknowledgedIdx: index("acknowledgedIdx").on(table.acknowledged),
}));

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Server access permissions for users
 */
export const serverPermissions = mysqlTable("serverPermissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  serverId: int("serverId").notNull(),
  canView: boolean("canView").default(true).notNull(),
  canManage: boolean("canManage").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  grantedBy: int("grantedBy").notNull(),
}, (table) => ({
  userIdIdx: index("userIdIdx").on(table.userId),
  serverIdIdx: index("serverIdIdx").on(table.serverId),
}));

export type ServerPermission = typeof serverPermissions.$inferSelect;
export type InsertServerPermission = typeof serverPermissions.$inferInsert;

/**
 * LLM-powered log analysis results
 */
export const logAnalysis = mysqlTable("logAnalysis", {
  id: int("id").autoincrement().primaryKey(),
  serverId: int("serverId").notNull(),
  analysisType: mysqlEnum("analysisType", ["pattern", "prediction", "troubleshooting", "summary"]).notNull(),
  logIds: text("logIds"), // JSON array of log IDs analyzed
  findings: text("findings").notNull(), // LLM-generated insights
  recommendations: text("recommendations"), // Suggested actions
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  serverIdIdx: index("serverIdIdx").on(table.serverId),
  createdAtIdx: index("createdAtIdx").on(table.createdAt),
}));

export type LogAnalysis = typeof logAnalysis.$inferSelect;
export type InsertLogAnalysis = typeof logAnalysis.$inferInsert;
