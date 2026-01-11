import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import * as webhooks from './webhooks';
import * as db from './db';

export const webhookRouter = router({
  /**
   * Public webhook endpoint - receives events from external systems
   * Requires API key authentication via header
   */
  handleEvent: publicProcedure
    .input(z.object({
      action: z.string(),
      serverId: z.number().optional(),
      data: z.record(z.string(), z.any()).optional(),
      apiKey: z.string(),
      signature: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify API key
        const apiKey = await db.getApiKeyByKey(input.apiKey);
        if (!apiKey || !apiKey.active) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or inactive API key',
          });
        }

        // Get user from API key
        const user = await db.getUserById(apiKey.userId);
        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not found',
          });
        }

        // Process webhook
        const payload: webhooks.WebhookPayload = {
          action: input.action,
          serverId: input.serverId,
          data: input.data || {},
          timestamp: Date.now(),
        };

        const result = await webhooks.processWebhook(payload, user.id);

        // Log webhook event
        await db.createWebhookLog({
          userId: user.id,
          action: input.action,
          serverId: input.serverId,
          payload: JSON.stringify(payload),
          response: JSON.stringify(result),
          status: 'success',
          timestamp: new Date(),
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log failed webhook event
        await db.createWebhookLog({
          userId: 0,
          action: input.action,
          serverId: input.serverId,
          payload: JSON.stringify(input),
          response: JSON.stringify({ error: errorMessage }),
          status: 'failed',
          timestamp: new Date(),
        });

        throw error;
      }
    }),

  /**
   * Create API key for webhook authentication
   */
  createApiKey: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const apiKey = await db.createApiKey({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        key: `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        active: true,
        createdAt: new Date(),
      });

      return apiKey;
    }),

  /**
   * List API keys for current user
   */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    return await db.getApiKeysByUserId(ctx.user.id);
  }),

  /**
   * Revoke API key
   */
  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const apiKey = await db.getApiKeyById(input.id);
      if (!apiKey || apiKey.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'API key not found or you do not have permission',
        });
      }

      await db.updateApiKey(input.id, { active: false });
      return { success: true };
    }),

  /**
   * Get webhook logs
   */
  getWebhookLogs: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      return await db.getWebhookLogsByUserId(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Get API documentation
   */
  getApiDocs: publicProcedure.query(() => {
    return {
      baseUrl: process.env.VITE_FRONTEND_FORGE_API_URL || 'https://your-domain.com/api',
      endpoints: [
        {
          method: 'POST',
          path: '/trpc/webhook.handleEvent',
          description: 'Handle webhook event from external system',
          authentication: 'API Key in request body',
          payload: {
            action: 'string (create_server | start_server | stop_server | restart_server | delete_server | update_metrics)',
            serverId: 'number (optional, required for most actions)',
            data: 'object (action-specific data)',
            apiKey: 'string (your API key)',
            signature: 'string (optional, HMAC-SHA256 signature)',
          },
          examples: {
            createServer: {
              action: 'create_server',
              data: {
                name: 'My Server',
                hostname: 'my-server.example.com',
                ipAddress: '192.168.1.100',
                port: 22,
                os: 'Ubuntu',
                osVersion: '22.04 LTS',
              },
              apiKey: 'sk_xxxxx',
            },
            updateMetrics: {
              action: 'update_metrics',
              serverId: 1,
              data: {
                cpuUsage: 45.2,
                ramUsage: 8589934592,
                ramUsagePercent: 50,
                diskUsage: 107374182400,
                diskUsagePercent: 40,
                networkIn: 1073741824,
                networkOut: 536870912,
                activeConnections: 125,
              },
              apiKey: 'sk_xxxxx',
            },
            startServer: {
              action: 'start_server',
              serverId: 1,
              apiKey: 'sk_xxxxx',
            },
          },
        },
      ],
    };
  }),
});

export type WebhookRouter = typeof webhookRouter;
