export class CacheService {
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
    const built = this.buildKey(key);
    const current = Number((await this.kv.get(built)) || "0");
    const next = current + 1;
    await this.kv.put(built, String(next), { expirationTtl: ttl || this.defaultTTL });
    return next;
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
