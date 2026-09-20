import createPrisma from "../../plugins/prisma-worker";
import { CacheService } from "../../plugins/cache-kv";
import { bcryptClient } from "../../plugins/bcryptjs";
import { createJwt, type JwtClient } from "./jwt";
import { authenticate } from "../middleware/check-tenant";
import type { PrismaClient } from "@prisma/client";

const context = {
  prisma: undefined as PrismaClient | undefined,
  jwt: undefined as JwtClient | undefined,
  cache: null as CacheService | null,
};

export function initContext(env: { DATABASE_URL?: string; JWT_SECRET?: string; CACHE?: KVNamespace }) {
  if (env.DATABASE_URL && !context.prisma) context.prisma = createPrisma(env.DATABASE_URL);
  if (!context.jwt) context.jwt = createJwt(env.JWT_SECRET || "JWT_SECRET");
  if (env.CACHE && !context.cache) context.cache = new CacheService(env.CACHE);
}

const prismaProxy: any = new Proxy(function () {}, {
  get(_target, prop) {
    if (!context.prisma) throw new Error("Prisma not initialised: no request env");
    const client = context.prisma as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (this: unknown, ...a: unknown[]) => unknown).bind(context.prisma) : value;
  },
});

const jwtProxy: any = new Proxy(function () {}, {
  get(_target, prop) {
    if (!context.jwt) throw new Error("JWT not initialised: no request env");
    return (context.jwt as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const lazyContext = {
  prisma: prismaProxy,
  jwt: jwtProxy,
  bcrypt: bcryptClient,
  cache: null as CacheService | null,
};

export function getApp(c: { env: { DATABASE_URL?: string; JWT_SECRET?: string; CACHE?: KVNamespace } }) {
  initContext(c.env);
  return {
    prisma: lazyContext.prisma,
    cache: context.cache,
    jwt: lazyContext.jwt,
    bcrypt: lazyContext.bcrypt,
    authenticate,
  };
}
