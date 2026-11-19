// Phase 7: cache provider tests. The in-memory implementation is unit-tested
// directly; the Redis-backed adapter is exercised against the real Redis
// (skipped cleanly when unreachable) to prove the shared contract behaves
// identically, including fixed-window counters.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { CacheService as RedisCache } from "../../src/plugins/cache";
import { InMemoryCache } from "../../src/utils/cache";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cacheContractTests(cache: InMemoryCache | RedisCache) {
  await test("set/get/del round-trips values", async () => {
    await cache.set("contract:obj", { hello: "world" });
    assert.deepEqual(await cache.get<{ hello: string }>("contract:obj"), { hello: "world" });

    await cache.set("contract:str", "raw-string");
    assert.equal(await cache.get<string>("contract:str"), "raw-string");

    await cache.del("contract:obj");
    assert.equal(await cache.get("contract:obj"), null);
  });

  await test("fixed-window incr preserves the window and resets after expiry", async () => {
    const key = "contract:window";
    await cache.del(key); // clear any leftover state from prior runs
    const first = await cache.incr(key, 1);
    const second = await cache.incr(key, 1);
    assert.equal(first, 1);
    assert.equal(second, 2, "increments within the window keep the count");

    await sleep(1200);
    const afterExpiry = await cache.incr(key, 1);
    assert.equal(afterExpiry, 1, "a new window starts from 1 after expiry");
    await cache.del(key);
  });
}

test("in-memory cache provider", async (t: TestContext) => {
  const cache = new InMemoryCache();
  await cacheContractTests(cache);

  await t.test("delPattern removes matching keys", async () => {
    await cache.set("pattern:a", 1);
    await cache.set("pattern:b", 2);
    await cache.set("other:c", 3);
    await cache.delPattern("pattern:*");
    assert.equal(await cache.get("pattern:a"), null);
    assert.equal(await cache.get("pattern:b"), null);
    assert.equal(await cache.get("other:c"), 3);
  });

  await t.test("hash operations round-trip", async () => {
    await cache.setHash("hash:1", "field", { nested: true });
    assert.deepEqual(await cache.getHash<{ nested: boolean }>("hash:1", "field"), {
      nested: true,
    });
    await cache.delHashField("hash:1", "field");
    assert.equal(await cache.getHash("hash:1", "field"), null);
  });
});

test("redis-backed cache provider (real Redis)", async (t: TestContext) => {
  // The adapter takes an injected client (the plugin normally builds it);
  // construct one here with a bounded connection attempt.
  let reachable = false;
  let client: any = null;
  try {
    const Redis = (await import("ioredis")).default as any;
    client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    reachable = true;
  } catch {
    reachable = false;
  }
  if (!reachable || !client) {
    t.skip("Redis is not reachable");
    client?.disconnect?.();
    return;
  }

  const cache = new RedisCache(client);
  t.after(async () => {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  });

  await cacheContractTests(cache);

  await t.test("exists and ttl behave on real Redis", async () => {
    await cache.set("contract:ttl", "x", 10);
    assert.equal(await cache.exists("contract:ttl"), true);
    const remaining = await cache.ttl("contract:ttl");
    assert.ok(remaining > 0 && remaining <= 10, `ttl within window: ${remaining}`);
    await cache.del("contract:ttl");
    assert.equal(await cache.exists("contract:ttl"), false);
  });
});
