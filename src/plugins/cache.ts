import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    cache: CacheService;
  }
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export class CacheService {
  private redis: any;
  private defaultTTL: number;
  private prefix: string;

  constructor(redis: any, defaultTTL = 3600) {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
    this.prefix = "cms:";
  }

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(this.buildKey(key));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    await this.redis.setex(this.buildKey(key), ttl || this.defaultTTL, data);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.buildKey(key));
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(this.buildKey(pattern));
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(this.buildKey(key));
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(this.buildKey(key));
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(this.buildKey(key));
  }

  async decr(key: string): Promise<number> {
    return this.redis.decr(this.buildKey(key));
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(this.buildKey(key), seconds);
  }

  async setHash(key: string, field: string, value: unknown): Promise<void> {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    await this.redis.hset(this.buildKey(key), field, data);
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    const data = await this.redis.hget(this.buildKey(key), field);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async delHashField(key: string, field: string): Promise<void> {
    await this.redis.hdel(this.buildKey(key), field);
  }

  async getAllHash<T>(key: string): Promise<Record<string, T>> {
    const data = await this.redis.hgetall(this.buildKey(key));
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(data)) {
      try {
        result[k] = JSON.parse(String(v)) as T;
      } catch {
        result[k] = String(v) as unknown as T;
      }
    }
    return result;
  }
}

const cachePlugin: PluginType = async (fastify) => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  let redis: any = null;
  let connected = false;

  try {
    const Redis = (await import("ioredis")).default as any;
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    redis.on("error", (err: Error) => {
      fastify.log.error({ err }, "Redis connection error");
    });

    redis.on("connect", () => {
      fastify.log.info("Redis connected");
      connected = true;
    });

    await redis.connect();
  } catch (err) {
    fastify.log.warn({ err }, "Redis connection failed, caching disabled");
  }

  const cache = new CacheService(redis);

  fastify.decorate("cache", cache);

  fastify.addHook("onClose", async () => {
    if (redis && connected) {
      await redis.quit();
    }
  });
};

export default fp(cachePlugin, {
  name: "cache",
});

export const CACHE_KEYS = {
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCTS_LIST: (tenantId: string) => `products:${tenantId}:list`,
  PRODUCT_VARIATIONS: (productId: string) => `product:${productId}:variations`,
  CART: (cartId: string) => `cart:${cartId}`,
  USER_SESSION: (userId: string) => `session:${userId}`,
  RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
  TENANT_CONFIG: (tenantId: string) => `tenant:${tenantId}:config`,
} as const;
