import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";

describe("API Key Management", () => {
  const testUserId = 1;
  const testKeyName = "Test API Key";
  const testKeyDescription = "Test key for unit tests";

  beforeEach(async () => {
    // Clean up any test keys before each test
    const keys = await db.getApiKeysByUserId(testUserId);
    for (const key of keys) {
      if (key.name.startsWith("Test")) {
        await db.deleteApiKey(key.id);
      }
    }
  });

  it("should create a new API key", async () => {
    const newKey = await db.createApiKey({
      userId: testUserId,
      name: testKeyName,
      description: testKeyDescription,
      key: `sk_test_${Date.now()}`,
      active: true,
      createdAt: new Date(),
    });

    expect(newKey).toBeDefined();
    expect(newKey.name).toBe(testKeyName);
    expect(newKey.description).toBe(testKeyDescription);
    expect(newKey.active).toBe(true);
    expect(newKey.key).toMatch(/^sk_test_/);
  });

  it("should retrieve API key by key string", async () => {
    const testKeyString = `sk_test_${Date.now()}`;
    const created = await db.createApiKey({
      userId: testUserId,
      name: testKeyName,
      key: testKeyString,
      active: true,
      createdAt: new Date(),
    });

    const retrieved = await db.getApiKeyByKey(testKeyString);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe(testKeyName);
  });

  it("should retrieve API key by ID", async () => {
    const created = await db.createApiKey({
      userId: testUserId,
      name: testKeyName,
      key: `sk_test_${Date.now()}`,
      active: true,
      createdAt: new Date(),
    });

    const retrieved = await db.getApiKeyById(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe(testKeyName);
  });

  it("should list all API keys for a user", async () => {
    const key1 = await db.createApiKey({
      userId: testUserId,
      name: "Test Key 1",
      key: `sk_test_1_${Date.now()}`,
      active: true,
      createdAt: new Date(),
    });

    const key2 = await db.createApiKey({
      userId: testUserId,
      name: "Test Key 2",
      key: `sk_test_2_${Date.now()}`,
      active: true,
      createdAt: new Date(),
    });

    const keys = await db.getApiKeysByUserId(testUserId);
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(keys.some(k => k.id === key1.id)).toBe(true);
    expect(keys.some(k => k.id === key2.id)).toBe(true);
  });

  it("should update API key", async () => {
    const created = await db.createApiKey({
      userId: testUserId,
      name: testKeyName,
      key: `sk_test_${Date.now()}`,
      active: true,
      createdAt: new Date(),
    });

    const updated = await db.updateApiKey(created.id, {
      active: false,
    });

    expect(updated).toBeDefined();
    expect(updated?.active).toBe(false);
  });

  it("should revoke API key by setting active to false", async () => {
    const created = await db.createApiKey({
      userId: testUserId,
      name: testKeyName,
      key: `sk_test_${Date.now()}`,
      active: true,
      createdAt: new Date(),
    });

    expect(created.active).toBe(true);

    const revoked = await db.updateApiKey(created.id, {
      active: false,
    });

    expect(revoked?.active).toBe(false);

    const retrieved = await db.getApiKeyById(created.id);
    expect(retrieved?.active).toBe(false);
  });

  it("should delete API key", async () => {
    const created = await db.createApiKey({
      userId: testUserId,
      name: testKeyName,
      key: `sk_test_${Date.now()}`,
      active: true,
      createdAt: new Date(),
    });

    await db.deleteApiKey(created.id);

    const retrieved = await db.getApiKeyById(created.id);
    expect(retrieved).toBeUndefined();
  });

  it("should return undefined for non-existent key", async () => {
    const retrieved = await db.getApiKeyByKey("sk_nonexistent");
    expect(retrieved).toBeUndefined();
  });

  it("should handle inactive keys correctly", async () => {
    const created = await db.createApiKey({
      userId: testUserId,
      name: testKeyName,
      key: `sk_test_${Date.now()}`,
      active: false,
      createdAt: new Date(),
    });

    const retrieved = await db.getApiKeyByKey(created.key);
    expect(retrieved?.active).toBe(false);
  });
});
