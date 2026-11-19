import type { CacheProvider } from "../utils/cache";

export class CacheService implements CacheProvider {
  private kv: KVNamespace;
  private defaultTTL: number;
  private prefix: string;

  constructor(kv: KVNamespace, defaultTTL = 3600) {
    this.kv = kv;
    this.defaultTTL = defaultTTL;
    this.prefix = "cms:";
  }

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.kv.get(this.buildKey(key));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    await this.kv.put(this.buildKey(key), data, { expirationTtl: ttl || this.defaultTTL });
  }

  async del(key: string): Promise<void> {
    await this.kv.delete(this.buildKey(key));
  }

  async delPattern(pattern: string): Promise<void> {
    let cursor: string | undefined;
    const fullPrefix = this.buildKey(pattern.replace(/\*/g, ""));
    do {
      const list = await this.kv.list({ prefix: fullPrefix, cursor });
      for (const key of list.keys) {
        await this.kv.delete(key.name);
      }
      cursor = list.list_complete ? undefined : (list as { cursor: string }).cursor;
    } while (cursor);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.kv.get(this.buildKey(key))) !== null;
  }

  async ttl(): Promise<number> {
    return -2;
  }

  async incr(key: string, ttl?: number): Promise<number> {
    // Fixed-window counter: the window expiry is embedded in the value
    // (KV exposes no remaining TTL) and is decided when the counter starts
    // from zero, mirroring the Redis adapter's SETEX-on-first-hit semantics.
    // KV increments are not atomic: concurrent writers may lose an
    // increment — acceptable for rate limiting, which fails open anyway.
    const built = this.buildKey(key);
    const seconds = ttl || this.defaultTTL;
    const nowSec = Math.floor(Date.now() / 1000);

    const raw = await this.kv.get(built);
    let window: { c: number; exp: number } | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.c === "number" && typeof parsed?.exp === "number") {
          window = parsed;
        }
      } catch {
        window = null;
      }
    }

    const next =
      window && window.exp > nowSec
        ? { c: window.c + 1, exp: window.exp }
        : { c: 1, exp: nowSec + seconds };

    await this.kv.put(built, JSON.stringify(next), { expirationTtl: seconds });
    return next.c;
  }

  async decr(key: string): Promise<number> {
    const built = this.buildKey(key);
    const current = Number((await this.kv.get(built)) || "0");
    const next = Math.max(0, current - 1);
    await this.kv.put(built, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const built = this.buildKey(key);
    const value = await this.kv.get(built);
    if (value !== null) {
      await this.kv.put(built, value, { expirationTtl: seconds });
    }
  }

  async setHash(key: string, field: string, value: unknown): Promise<void> {
    const existing = await this.getAllHashRecord(key);
    existing[field] = typeof value === "string" ? value : JSON.stringify(value);
    await this.kv.put(this.buildKey(key), JSON.stringify(existing), { expirationTtl: this.defaultTTL });
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    const record = await this.getAllHashRecord(key);
    const raw = record[field];
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async delHashField(key: string, field: string): Promise<void> {
    const existing = await this.getAllHashRecord(key);
    delete existing[field];
    await this.kv.put(this.buildKey(key), JSON.stringify(existing), { expirationTtl: this.defaultTTL });
  }

  async getAllHash<T>(key: string): Promise<Record<string, T>> {
    const data = await this.getAllHashRecord(key);
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(data)) {
      try {
        result[k] = JSON.parse(v) as T;
      } catch {
        result[k] = v as unknown as T;
      }
    }
    return result;
  }

  private async getAllHashRecord(key: string): Promise<Record<string, string>> {
    const raw = await this.kv.get(this.buildKey(key));
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }
}
