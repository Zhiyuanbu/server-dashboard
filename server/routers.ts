import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// Helper to generate simulated real-time metrics
function generateSimulatedMetrics(serverId: number) {
  return {
    serverId,
    cpuUsage: Math.random() * 100,
    ramUsage: Math.floor(Math.random() * 16 * 1024 * 1024 * 1024), // Random up to 16GB
    ramUsagePercent: Math.random() * 100,
    diskUsage: Math.floor(Math.random() * 500 * 1024 * 1024 * 1024), // Random up to 500GB
    diskUsagePercent: Math.random() * 100,
    networkIn: Math.floor(Math.random() * 1024 * 1024 * 100), // Random network traffic
    networkOut: Math.floor(Math.random() * 1024 * 1024 * 100),
    activeConnections: Math.floor(Math.random() * 200),
    timestamp: new Date(),
  };
}

// Helper to generate simulated processes
function generateSimulatedProcesses(serverId: number, count: number = 20) {
  const processNames = ['nginx', 'mysql', 'redis', 'node', 'python', 'apache2', 'postgres', 'docker', 'systemd', 'sshd'];
  const users = ['root', 'www-data', 'mysql', 'redis', 'ubuntu'];
  const statuses = ['running', 'sleeping', 'stopped', 'zombie'] as const;
  
  return Array.from({ length: count }, (_, i) => ({
    serverId,
    pid: 1000 + i,
    name: processNames[Math.floor(Math.random() * processNames.length)]!,
    user: users[Math.floor(Math.random() * users.length)],
    cpuUsage: Math.random() * 50,
    ramUsage: Math.floor(Math.random() * 1024 * 1024 * 1024),
    status: statuses[Math.floor(Math.random() * statuses.length)]!,
    command: `/usr/bin/${processNames[Math.floor(Math.random() * processNames.length)]}`,
    startTime: new Date(Date.now() - Math.random() * 86400000 * 7),
    timestamp: new Date(),
  }));
}

// Helper to generate simulated logs
function generateSimulatedLogs(serverId: number, count: number = 50) {
  const levels = ['info', 'warning', 'error', 'critical'] as const;
  const sources = ['kernel', 'systemd', 'nginx', 'mysql', 'application', 'security'];
  const messages = [
    'Service started successfully',
    'Connection established',
    'High memory usage detected',
    'Disk space running low',
    'Authentication failed',
    'Service restarted',
    'Network timeout occurred',
    'Database query slow',
    'Cache cleared',
    'Configuration reloaded',
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    serverId,
    level: levels[Math.floor(Math.random() * levels.length)]!,
    source: sources[Math.floor(Math.random() * sources.length)],
    message: messages[Math.floor(Math.random() * messages.length)]!,
    details: JSON.stringify({ timestamp: Date.now(), index: i }),
    timestamp: new Date(Date.now() - Math.random() * 3600000 * 24),
  }));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Server Management
  servers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllServers(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const server = await db.getServerById(input.id);
        if (!server) throw new TRPCError({ code: 'NOT_FOUND', message: 'Server not found' });
        return server;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        hostname: z.string().min(1),
        ipAddress: z.string().min(1),
        port: z.number().default(22),
        os: z.string().optional(),
        osVersion: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const server = await db.createServer({
          ...input,
          status: 'online',
          createdBy: ctx.user.id,
          lastSeen: new Date(),
        });
        
        // Create initial metrics
        await db.createMetric(generateSimulatedMetrics(server.id));
        
        return server;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        hostname: z.string().optional(),
        ipAddress: z.string().optional(),
        port: z.number().optional(),
        status: z.enum(['online', 'offline', 'warning', 'error']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateServer(id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteServer(input.id);
        return { success: true };
      }),

    // Initialize demo servers with data
    initializeDemoServers: protectedProcedure.mutation(async ({ ctx }) => {
      const demoServers = [
        {
          name: 'Production Web Server',
          hostname: 'web-prod-01',
          ipAddress: '192.168.1.10',
          port: 22,
          status: 'online' as const,
          os: 'Ubuntu',
          osVersion: '22.04 LTS',
          kernelVersion: '5.15.0-91-generic',
          cpuModel: 'Intel Xeon E5-2680 v4',
          cpuCores: 8,
          totalRam: 32 * 1024 * 1024 * 1024,
          totalDisk: 500 * 1024 * 1024 * 1024,
          uptime: 2592000,
          lastSeen: new Date(),
          createdBy: ctx.user.id,
        },
        {
          name: 'Database Server',
          hostname: 'db-prod-01',
          ipAddress: '192.168.1.20',
          port: 22,
          status: 'online' as const,
          os: 'Ubuntu',
          osVersion: '22.04 LTS',
          kernelVersion: '5.15.0-91-generic',
          cpuModel: 'AMD EPYC 7742',
          cpuCores: 16,
          totalRam: 64 * 1024 * 1024 * 1024,
          totalDisk: 2 * 1024 * 1024 * 1024 * 1024,
          uptime: 5184000,
          lastSeen: new Date(),
          createdBy: ctx.user.id,
        },
        {
          name: 'Development Server',
          hostname: 'dev-01',
          ipAddress: '192.168.1.30',
          port: 22,
          status: 'warning' as const,
          os: 'Ubuntu',
          osVersion: '22.04 LTS',
          kernelVersion: '5.15.0-89-generic',
          cpuModel: 'Intel Core i7-9700K',
          cpuCores: 4,
          totalRam: 16 * 1024 * 1024 * 1024,
          totalDisk: 250 * 1024 * 1024 * 1024,
          uptime: 864000,
          lastSeen: new Date(),
          createdBy: ctx.user.id,
        },
      ];

      const createdServers = [];
      for (const serverData of demoServers) {
        const server = await db.createServer(serverData);
        
        // Generate initial metrics history (last 50 data points)
        for (let i = 0; i < 50; i++) {
          await db.createMetric({
            ...generateSimulatedMetrics(server.id),
            timestamp: new Date(Date.now() - (50 - i) * 60000), // 1 minute intervals
          });
        }
        
        // Generate logs
        const logs = generateSimulatedLogs(server.id, 100);
        for (const log of logs) {
          await db.createLog(log);
        }
        
        // Generate processes
        const processes = generateSimulatedProcesses(server.id, 25);
        await db.upsertProcesses(processes);
        
        createdServers.push(server);
      }

      return createdServers;
    }),
  }),

  // Metrics
  metrics: router({
    latest: protectedProcedure
      .input(z.object({ serverId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return await db.getLatestMetrics(input.serverId, input.limit);
      }),

    range: protectedProcedure
      .input(z.object({
        serverId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getMetricsInRange(input.serverId, input.startTime, input.endTime);
      }),

    // Simulate real-time metric update
    simulateUpdate: protectedProcedure
      .input(z.object({ serverId: z.number() }))
      .mutation(async ({ input }) => {
        const metric = await db.createMetric(generateSimulatedMetrics(input.serverId));
        return metric;
      }),
  }),

  // Logs
  logs: router({
    list: protectedProcedure
      .input(z.object({
        serverId: z.number(),
        limit: z.number().default(100),
        level: z.enum(['info', 'warning', 'error', 'critical']).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getServerLogs(input.serverId, input.limit, input.level);
      }),

    search: protectedProcedure
      .input(z.object({
        serverId: z.number(),
        searchTerm: z.string(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return await db.searchLogs(input.serverId, input.searchTerm, input.limit);
      }),

    // Simulate new log entry
    simulateLog: protectedProcedure
      .input(z.object({ serverId: z.number() }))
      .mutation(async ({ input }) => {
        const [log] = generateSimulatedLogs(input.serverId, 1);
        return await db.createLog(log!);
      }),
  }),

  // Processes
  processes: router({
    list: protectedProcedure
      .input(z.object({ serverId: z.number() }))
      .query(async ({ input }) => {
        return await db.getServerProcesses(input.serverId);
      }),

    // Simulate process action (start/stop/restart)
    action: protectedProcedure
      .input(z.object({
        serverId: z.number(),
        pid: z.number(),
        action: z.enum(['start', 'stop', 'restart']),
      }))
      .mutation(async ({ input }) => {
        // Simulate action - in real implementation, this would send commands to the server
        return {
          success: true,
          message: `Process ${input.pid} ${input.action} command sent successfully`,
        };
      }),
  }),

  // Alerts
  alerts: router({
    list: protectedProcedure
      .input(z.object({
        serverId: z.number(),
        includeAcknowledged: z.boolean().default(false),
      }))
      .query(async ({ input }) => {
        return await db.getServerAlerts(input.serverId, input.includeAcknowledged);
      }),

    acknowledge: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.acknowledgeAlert(input.alertId, ctx.user.id);
        return { success: true };
      }),

    configs: router({
      list: protectedProcedure
        .input(z.object({ serverId: z.number() }))
        .query(async ({ input }) => {
          return await db.getServerAlertConfigs(input.serverId);
        }),

      create: protectedProcedure
        .input(z.object({
          serverId: z.number(),
          metricType: z.enum(['cpu', 'ram', 'disk', 'network']),
          threshold: z.number(),
          operator: z.enum(['greater', 'less', 'equal']),
          notifyEmail: z.boolean().default(true),
          emailRecipients: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input }) => {
          return await db.createAlertConfig({
            ...input,
            emailRecipients: input.emailRecipients ? JSON.stringify(input.emailRecipients) : null,
            enabled: true,
          });
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          threshold: z.number().optional(),
          enabled: z.boolean().optional(),
          notifyEmail: z.boolean().optional(),
          emailRecipients: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, emailRecipients, ...updates } = input;
          await db.updateAlertConfig(id, {
            ...updates,
            ...(emailRecipients && { emailRecipients: JSON.stringify(emailRecipients) }),
          });
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteAlertConfig(input.id);
          return { success: true };
        }),
    }),
  }),

  // User Management
  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      return await db.getAllUsers();
    }),

    permissions: router({
      list: protectedProcedure
        .input(z.object({ userId: z.number() }))
        .query(async ({ input }) => {
          return await db.getUserServerPermissions(input.userId);
        }),

      grant: protectedProcedure
        .input(z.object({
          userId: z.number(),
          serverId: z.number(),
          canView: z.boolean().default(true),
          canManage: z.boolean().default(false),
          canDelete: z.boolean().default(false),
        }))
        .mutation(async ({ input, ctx }) => {
          if (ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
          }
          return await db.grantServerPermission({
            ...input,
            grantedBy: ctx.user.id,
          });
        }),

      revoke: protectedProcedure
        .input(z.object({ permissionId: z.number() }))
        .mutation(async ({ input, ctx }) => {
          if (ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
          }
          await db.revokeServerPermission(input.permissionId);
          return { success: true };
        }),
    }),
  }),

  // Log Analysis (LLM-powered)
  analysis: router({
    list: protectedProcedure
      .input(z.object({
        serverId: z.number(),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        return await db.getServerLogAnalysis(input.serverId, input.limit);
      }),

    analyze: protectedProcedure
      .input(z.object({
        serverId: z.number(),
        analysisType: z.enum(['pattern', 'prediction', 'troubleshooting', 'summary']),
      }))
      .mutation(async ({ input }) => {
        // Get recent logs for analysis
        const logs = await db.getServerLogs(input.serverId, 100);
        
        // In a real implementation, this would call LLM API
        // For now, return simulated analysis
        const findings = `Analysis of ${logs.length} recent log entries reveals normal system operation with ${logs.filter(l => l.level === 'error').length} errors detected.`;
        const recommendations = 'Monitor disk usage trends and consider implementing automated cleanup policies.';
        
        return await db.createLogAnalysis({
          serverId: input.serverId,
          analysisType: input.analysisType,
          logIds: JSON.stringify(logs.slice(0, 10).map(l => l.id)),
          findings,
          recommendations,
          severity: 'info',
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
