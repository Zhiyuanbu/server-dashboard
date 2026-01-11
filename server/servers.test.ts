import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: 'admin' | 'user' = 'admin'): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("servers router", () => {
  it("should list servers for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const servers = await caller.servers.list();
    
    expect(Array.isArray(servers)).toBe(true);
  });

  it("should create a new server", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newServer = await caller.servers.create({
      name: "Test Server",
      hostname: "test-server",
      ipAddress: "192.168.1.100",
      port: 22,
      os: "Ubuntu",
      osVersion: "22.04",
    });

    expect(newServer).toBeDefined();
    expect(newServer.name).toBe("Test Server");
    expect(newServer.hostname).toBe("test-server");
    expect(newServer.ipAddress).toBe("192.168.1.100");
    expect(newServer.status).toBe("online");
  });

  it("should get server by id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a server first
    const created = await caller.servers.create({
      name: "Test Server 2",
      hostname: "test-server-2",
      ipAddress: "192.168.1.101",
      port: 22,
    });

    // Ensure created server has valid ID
    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe('number');
    expect(created.id).toBeGreaterThan(0);

    // Get the server by id
    const server = await caller.servers.getById({ id: created.id });

    expect(server).toBeDefined();
    expect(server?.id).toBe(created.id);
    expect(server?.name).toBe("Test Server 2");
  });

  it("should initialize demo servers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const demoServers = await caller.servers.initializeDemoServers();

    expect(Array.isArray(demoServers)).toBe(true);
    expect(demoServers.length).toBeGreaterThan(0);
    expect(demoServers[0]).toHaveProperty('name');
    expect(demoServers[0]).toHaveProperty('hostname');
    expect(demoServers[0]).toHaveProperty('status');
  });
});

describe("metrics router", () => {
  it("should get latest metrics for a server", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a server first
    const server = await caller.servers.create({
      name: "Metrics Test Server",
      hostname: "metrics-test",
      ipAddress: "192.168.1.102",
      port: 22,
    });

    // Get metrics
    const metrics = await caller.metrics.latest({ serverId: server.id, limit: 10 });

    expect(Array.isArray(metrics)).toBe(true);
  });

  it("should simulate metric update", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a server first
    const server = await caller.servers.create({
      name: "Simulate Test Server",
      hostname: "simulate-test",
      ipAddress: "192.168.1.103",
      port: 22,
    });

    // Simulate metric update
    const metric = await caller.metrics.simulateUpdate({ serverId: server.id });

    expect(metric).toBeDefined();
    expect(metric.serverId).toBe(server.id);
    expect(metric.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(metric.cpuUsage).toBeLessThanOrEqual(100);
    expect(metric.ramUsagePercent).toBeGreaterThanOrEqual(0);
    expect(metric.ramUsagePercent).toBeLessThanOrEqual(100);
  });
});

describe("logs router", () => {
  it("should list logs for a server", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a server with demo data
    const servers = await caller.servers.initializeDemoServers();
    const server = servers[0];

    if (!server) {
      throw new Error("No demo server created");
    }

    // Get logs
    const logs = await caller.logs.list({ serverId: server.id, limit: 50 });

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    if (logs[0]) {
      expect(logs[0]).toHaveProperty('level');
      expect(logs[0]).toHaveProperty('message');
      expect(logs[0]).toHaveProperty('timestamp');
    }
  });

  it("should filter logs by level", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a server with demo data
    const servers = await caller.servers.initializeDemoServers();
    const server = servers[0];

    if (!server) {
      throw new Error("No demo server created");
    }

    // Get error logs only
    const errorLogs = await caller.logs.list({ 
      serverId: server.id, 
      limit: 50,
      level: 'error'
    });

    expect(Array.isArray(errorLogs)).toBe(true);
    errorLogs.forEach(log => {
      expect(log.level).toBe('error');
    });
  });
});

describe("processes router", () => {
  it("should list processes for a server", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a server with demo data
    const servers = await caller.servers.initializeDemoServers();
    const server = servers[0];

    if (!server) {
      throw new Error("No demo server created");
    }

    // Get processes
    const processes = await caller.processes.list({ serverId: server.id });

    expect(Array.isArray(processes)).toBe(true);
    expect(processes.length).toBeGreaterThan(0);
    if (processes[0]) {
      expect(processes[0]).toHaveProperty('pid');
      expect(processes[0]).toHaveProperty('name');
      expect(processes[0]).toHaveProperty('cpuUsage');
      expect(processes[0]).toHaveProperty('ramUsage');
    }
  });

  it("should simulate process action", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a server with demo data
    const servers = await caller.servers.initializeDemoServers();
    const server = servers[0];

    if (!server) {
      throw new Error("No demo server created");
    }

    // Simulate process action
    const result = await caller.processes.action({
      serverId: server.id,
      pid: 1234,
      action: 'restart'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('restart');
  });
});
