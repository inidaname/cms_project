import type { Context } from "hono";
import type { WorkerEnv } from "../types";
import createPrisma from "../../plugins/prisma-worker";
import { CacheService } from "../../plugins/cache-kv";
import { bcryptClient } from "../../plugins/bcryptjs";
import { createJwt, type JwtClient } from "./jwt";

export interface AppContext {
  prisma: ReturnType<typeof createPrisma>;
  cache: CacheService | null;
  jwt: JwtClient;
  bcrypt: typeof bcryptClient;
}

const instances = new WeakMap<Context, AppContext>();

export function getApp(c: Context<WorkerEnv>): AppContext {
  const existing = instances.get(c);
  if (existing) return existing;

  // Security: a deployed Worker without JWT_SECRET must fail fast. For local
  // development set it in .dev.vars (or via `wrangler secret put`).
  if (!c.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured. Set it with `wrangler secret put JWT_SECRET` (or in .dev.vars for local development).",
    );
  }

  const ctx: AppContext = {
    prisma: createPrisma(c.env.DATABASE_URL),
    cache: c.env.CACHE ? new CacheService(c.env.CACHE) : null,
    jwt: createJwt(c.env.JWT_SECRET),
    bcrypt: bcryptClient,
  };

  instances.set(c, ctx);
  return ctx;
}

export async function closeApp(c: Context<WorkerEnv>): Promise<void> {
  const ctx = instances.get(c);
  if (!ctx) return;

  instances.delete(c);
  await ctx.prisma.$disconnect();
}
