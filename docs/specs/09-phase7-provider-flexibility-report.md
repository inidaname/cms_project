# Phase 7 Report — Provider and Cache Flexibility (prompt 6)

Status: **implemented and validated 2026-11-19**.

## Shared provider contracts (smallest surface the current services use)

| Provider | Contract | Implementations |
|---|---|---|
| Cache | `CacheProvider` (`src/utils/cache.ts`): get/set/del/delPattern/exists/ttl/incr/decr/expire/hash ops | `plugins/cache.ts` (Node, Redis — now `implements CacheProvider`), `plugins/cache-kv.ts` (Worker KV), **new `InMemoryCache`** for tests and no-backend runs |
| Email | `EmailProvider` (`src/utils/email.ts`): `send(msg) → { ok: true, id } \| { ok: false, error }` | `ResendEmailProvider`, **new explicit `NullEmailProvider`**, plus a selector `createPlatformEmailProvider(env)` driven by `RESEND_API_KEY` |
| Payments | `PaymentProvider` (`core/finecore/types.ts`): `createCheckoutSession(...)` | `FinecoreClient implements PaymentProvider` — future providers slot in without touching handlers |
| Storage | `StorageProvider` (`helpers/upload.ts`): `put(key, body, contentType)` — keys are opaque; client filenames never cross the boundary | Node S3/R2 implementation in the upload route; Worker native R2 binding (contract documented for both) |

`src/helpers/content.ts` and the unused `src/helpers/mail.ts` now route all
platform email through the provider. Function signatures are unchanged, so
no call sites were touched beyond the module boundary. Missing email
configuration is **explicit**: the Null provider returns
`{ ok: false, error: "Email provider is not configured (RESEND_API_KEY
missing)" }` — never a silent "success" — and the existing best-effort
callers log and continue exactly as before. No provider credentials appear
in responses or logs.

## Environment validation centralization

- `src/utils/env.ts`: `isProduction()`, `optionalEnv()`, `requiredEnv()`
  (missing in production is fatal; dev warns once and continues).
- `jwt-plugin.ts` now reads `JWT_SECRET` through `requiredEnv` (same
  fail-fast semantics as Phase 3, centralized).

## Deferred items from earlier phases — both fixed

1. **Worker KV rate-limit windows**: `incr` on KV previously reset the TTL
   on every write (effectively a sliding window, diverging from Node's
   fixed window). It now embeds the window expiry in the value and honors
   it, giving **fixed-window semantics identical to the Redis adapter**
   (`expire on first hit from zero`). KV's inherent non-atomic increment
   (concurrent writers may lose one count) is documented — rate limiting
   fails open anyway.
2. **Redis adapter `incr(key, ttl)` ignored its ttl argument** (the
   rate-limit plugin applied EXPIRE separately); the adapter now applies
   the window expiry itself when the counter starts from zero, matching
   the shared contract.
3. **Worker shim auth detection** (`Function.name === "authenticate"`)
   could silently grant or drop JWT enforcement for differently-named
   hooks. Detection is now **by function reference** against the scope's
   injected guard, with the name check kept as a fallback.

## Tests (new)

- `test/plugins/cache.test.ts`: the full cache contract is run against the
  **in-memory provider** and the **real Redis** (the existing `adp-redis`
  container on `localhost:6379`; the suite skips cleanly when Redis is
  unreachable), including fixed-window counter behavior (window preserved
  across increments, reset after expiry).
- `test/plugins/rate-limit.test.ts`: the actual rate-limit plugin on a
  probe Fastify with a small limit against real Redis — third request 429
  with `Retry-After`, new window admits again.
- `test/plugins/email-provider.test.ts`: configuration-driven selection,
  explicit Null-provider failure, explicit provider-error mapping, network
  failure survival, and fake-provider injection for services.
- `test/plugins/shim-auth.test.ts`: reference-based auth-hook detection,
  non-auth hooks never flip routes into JWT-enforced mode.

## Compatibility

- Public HTTP contracts unchanged; default providers unchanged
  (Finecore/Resend/Redis/KV/R2 remain the defaults).
- Cache key values written by `incr` on the KV adapter changed format
  (embedded window JSON) — these keys are rate-limit counters only, never
  read by other consumers.

## Validation results

- `npm run build:ts`, `npm run typecheck:worker`, `npx tsc -p test/tsconfig.json` — pass
- Full suite: **113/113 pass, exit 0**
