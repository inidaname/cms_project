// Phase 7: rate-limit middleware integration with a real Redis (adp-redis).
// Registers the actual rate-limit plugin on a probe Fastify instance with a
// small limit so the fixed-window semantics are exercised end to end.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

test("rate limiting with real Redis", async (t: TestContext) => {
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
  } catch {
    t.skip("Redis is not reachable");
    client?.disconnect?.();
    return;
  }

  t.after(async () => {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  });

  const Fastify = require("fastify");
  const fp = require("fastify-plugin");
  const cachePlugin = require("../../src/plugins/cache").default;
  const rateLimitPlugin = require("../../src/plugins/rate-limit").default;

  const app = Fastify({ logger: false });
  await app.register(fp(cachePlugin as any));
  await app.register(fp(rateLimitPlugin as any), { max: 2, timeWindow: 1 });
  app.get("/probe", async () => ({ ok: true }));
  await app.ready();

  // Distinct IP per run so reruns never inherit a previous window.
  const ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;

  const res1 = await app.inject({ method: "GET", url: "/probe", remoteAddress: ip });
  const res2 = await app.inject({ method: "GET", url: "/probe", remoteAddress: ip });
  const res3 = await app.inject({ method: "GET", url: "/probe", remoteAddress: ip });
  const res4 = await app.inject({ method: "GET", url: "/probe", remoteAddress: ip });

  assert.equal(res1.statusCode, 200);
  assert.equal(res2.statusCode, 200);
  assert.equal(res3.statusCode, 429, `third request hits the limit: ${res3.body}`);
  assert.equal(res4.statusCode, 429);
  assert.ok(res3.json().message.includes("Rate limit exceeded"));
  assert.ok(res3.headers["retry-after"]);

  // The window expires after ~1s: requests are allowed again.
  await new Promise((r) => setTimeout(r, 1300));
  const res5 = await app.inject({ method: "GET", url: "/probe", remoteAddress: ip });
  assert.equal(res5.statusCode, 200, "a new window admits requests again");

  await app.close();
});
