// Shared cache-provider contract used by the Node (Redis) and Worker (KV)
// adapters, plus an in-memory implementation for tests and local runs.
//
// TTL notes:
// - The Redis adapter supports true TTLs.
// - The KV adapter implements fixed-window counters by embedding the window
//   expiry in the value (KV cannot read remaining TTLs); increments are not
//   atomic under KV, so concurrent writers may lose an increment.
// - `ttl()` returns -2 ("key not found") when a runtime cannot report
//   remaining TTLs.

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  incr(key: string, ttl?: number): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  setHash(key: string, field: string, value: unknown): Promise<void>;
  getHash<T>(key: string, field: string): Promise<T | null>;
  delHashField(key: string, field: string): Promise<void>;
  getAllHash<T>(key: string): Promise<Record<string, T>>;
}

const DEFAULT_TTL = 3600;

interface FixedWindowValue {
  c: number;
  exp: number; // epoch seconds
}

/**
 * In-memory CacheProvider. Deterministic and dependency-free: used by unit
 * tests (via fake injection) and as the fallback when no cache backend is
 * configured in local development.
 */
export class InMemoryCache implements CacheProvider {
  private store = new Map<string, { value: string; expiresAt: number | null }>();
  private defaultTTL: number;
  private prefix = "cms:";

  constructor(defaultTTL = DEFAULT_TTL) {
    this.defaultTTL = defaultTTL;
  }

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(expiresAt: number | null): boolean {
    return expiresAt !== null && Date.now() > expiresAt;
  }

  private readRaw(key: string): { value: string; expiresAt: number | null } | null {
    const entry = this.store.get(this.buildKey(key));
    if (!entry) return null;
    if (this.isExpired(entry.expiresAt)) {
      this.store.delete(this.buildKey(key));
      return null;
    }
    return entry;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.readRaw(key);
    if (!entry) return null;
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    const seconds = ttl || this.defaultTTL;
    this.store.set(this.buildKey(key), {
      value: data,
      expiresAt: Date.now() + seconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(this.buildKey(key));
  }

  async delPattern(pattern: string): Promise<void> {
    const base = `${this.prefix}${pattern.replace(/\*/g, "")}`;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(base)) this.store.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.readRaw(key) !== null;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.readRaw(key);
    if (!entry || entry.expiresAt === null) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  async incr(key: string, ttl?: number): Promise<number> {
    const entry = this.readRaw(key);
    const seconds = ttl || this.defaultTTL;
    const now = Date.now();

    // Fixed-window semantics: the window expiry is decided when the counter
    // starts from zero and is preserved across increments.
    let window: FixedWindowValue;
    if (!entry) {
      window = { c: 1, exp: Math.floor((now + seconds * 1000) / 1000) };
    } else {
      const parsed = this.parseWindow(entry.value);
      window =
        parsed && parsed.exp * 1000 > now
          ? { c: parsed.c + 1, exp: parsed.exp }
          : { c: 1, exp: Math.floor((now + seconds * 1000) / 1000) };
    }
    this.store.set(this.buildKey(key), {
      value: JSON.stringify(window),
      expiresAt: window.exp * 1000,
    });
    return window.c;
  }

  async decr(key: string): Promise<number> {
    const entry = this.readRaw(key);
    const current = entry ? this.parseWindow(entry.value)?.c ?? 0 : 0;
    const next = Math.max(0, current - 1);
    if (entry) {
      const window = this.parseWindow(entry.value) ?? { c: 0, exp: 0 };
      this.store.set(this.buildKey(key), {
        value: JSON.stringify({ ...window, c: next }),
        expiresAt: entry.expiresAt,
      });
    }
    return next;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.readRaw(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async setHash(key: string, field: string, value: unknown): Promise<void> {
    const entry = this.readRaw(key);
    const record = entry ? this.safeParseRecord(entry.value) : {};
    record[field] = typeof value === "string" ? value : JSON.stringify(value);
    this.store.set(this.buildKey(key), {
      value: JSON.stringify(record),
      expiresAt: Date.now() + this.defaultTTL * 1000,
    });
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    const entry = this.readRaw(key);
    if (!entry) return null;
    const record = this.safeParseRecord(entry.value);
    const raw = record[field];
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async delHashField(key: string, field: string): Promise<void> {
    const entry = this.readRaw(key);
    if (!entry) return;
    const record = this.safeParseRecord(entry.value);
    delete record[field];
    this.store.set(this.buildKey(key), {
      value: JSON.stringify(record),
      expiresAt: entry.expiresAt,
    });
  }

  async getAllHash<T>(key: string): Promise<Record<string, T>> {
    const entry = this.readRaw(key);
    if (!entry) return {};
    const record = this.safeParseRecord(entry.value);
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(record)) {
      try {
        result[k] = JSON.parse(v) as T;
      } catch {
        result[k] = v as unknown as T;
      }
    }
    return result;
  }

  private parseWindow(value: string): FixedWindowValue | null {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed?.c === "number" && typeof parsed?.exp === "number") {
        return parsed as FixedWindowValue;
      }
      return null;
    } catch {
      return null;
    }
  }

  private safeParseRecord(value: string): Record<string, string> {
    try {
      return JSON.parse(value) as Record<string, string>;
    } catch {
      return {};
    }
  }
}
