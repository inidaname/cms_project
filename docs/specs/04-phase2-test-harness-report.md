# Phase 2 Report — Test Harness and Tenant Fixtures (prompt 5)

Status: **implemented and validated 2026-11-19**. Committed by the user as
`73b63d8` (Phase 1 was committed as `bbce392`).

## What changed

### Harness repairs (pre-existing breakage fixed)

- `test/helper.ts`: added an explicit `/// <reference path>` to
  `src/types/app.d.ts` so ts-node can resolve the global `PluginType`
  declarations. Before this, every app-booting test failed to compile
  (`test/routes/root.test.ts` was broken at baseline).
- `package.json` `test` script: sets `TS_NODE_PROJECT=test/tsconfig.json` and
  `TS_NODE_TRANSPILE_ONLY=1`, and loads `.env` via `-r dotenv/config`, so
  plain `npm test` works without manual environment setup.
- `src/plugins/prisma.ts`: startup DB connect now fails fast after 15s with
  a clear error instead of hanging indefinitely when the database is
  unreachable (Neon endpoint was down during this phase).
- `test/routes/root.test.ts`: rewritten to current documented behavior —
  `/` requires an API key (401 without), `/health` and `/ping` are public.
- `test/routes/example.test.ts`: deleted (asserted a nonexistent `/example`
  route; scaffold leftover).

### Fixtures — `test/support/tenants.ts`

Two-tenant fixture used by every suite, created through the real app
(`test/helper.ts` + `app.inject`), with unique suffixes and best-effort
ordered teardown so reruns are safe:

- Tenants A and B (separate API keys), plus a **suspended tenant**.
- OWNER, ADMIN, and USER accounts for tenant A; OWNER for tenant B.
- Catalog data per tenant (products with stock, variations).
- Header builders for same-tenant (owner/admin/user), cross-tenant, and
  suspended key cases.
- JWTs signed with the app's own `app.jwt.sign` (same secret/expiry as
  production).

### New behavior-named suites

| File | Coverage (prompt 5 priority) |
|---|---|
| `test/routes/isolation.test.ts` (Phase 1) | Tenant isolation across users, carts, products, admin ops, webhook, notifications |
| `test/routes/auth-enforcement.test.ts` | Missing/invalid API keys, suspended tenant, bearer-token presence/validity, role gates (USER on admin, non-super-admin on super-admin), positive same-tenant cases |
| `test/routes/checkout-flow.test.ts` | Product → cart → checkout → sale happy path; double checkout 409; foreign-tenant and foreign-user carts rejected; user-scoped checkout lookup |
| `test/routes/webhook-payment.test.ts` | Signed webhook for unknown payment acknowledged without writes; stale timestamp rejected; completed-payment webhook transitions payment/cart/sale and is replay-safe; failed-payment keeps cart active |
| `test/routes/team-invites.test.ts` | Invite creation (persisted to the inviting tenant), single-use acceptance, replay rejected, expired and unknown tokens rejected, tenant-scoped team listing |
| `test/routes/subscribers-campaigns.test.ts` | Subscriber/list/campaign CRUD, tenant-owned list membership, campaign send scoped to tenant subscribers, foreign list rejected |

## App bugs found and fixed by the tests

1. **Checkout never transitioned the cart** (`src/core/sales/sales-service.ts`):
   `createCart` dedupes by returning the user's existing *Active* cart, but
   checkout only created a `Sales` row — the cart stayed `Active`, so every
   later cart-add silently reused the checked-out cart and all future
   checkouts returned 409 forever. Fix: checkout now sets the cart to
   `Checkedout`, and guard order was adjusted so a replayed checkout keeps
   its explicit 409 (replay guard before the status guard).
2. **Webhook timestamp staleness was ineffective**
   (`src/core/webhook/webhook-handler.ts`): epoch-millisecond timestamp
   headers parsed to `NaN` via `new Date(...)`, making `NaN > threshold`
   false — stale webhooks were accepted. Fix: robust parsing (ISO or
   epoch-ms), and malformed timestamps are now rejected.

## Phase 6 findings recorded (not changed in this phase)

Several `/admin/*` route response schemas serialize payloads to empty
objects (`data: {}`) because AJV response schemas omit the fields the
handlers send (`added`, `token`, campaign arrays). The affected tests assert
DB state instead and carry notes; the schemas must be reconciled in Phase 6
(prompt 7) without breaking clients.

## Validation results

- `npm run build:ts` — pass
- `npm run typecheck:worker` — pass
- `npx tsc -p test/tsconfig.json` — pass
- Full suite (`node --test --test-concurrency=1 -r ts-node/register "test/**/*.ts"`,
  `DATABASE_URL` pointing at the throwaway local Postgres): **60/60 pass,
  exit 0**

`npm test` runs the same suite against whatever `DATABASE_URL` is configured
(loaded from `.env` by the script). The configured Neon database was
unreachable during this phase; the throwaway container `cms-iso-test-pg`
(localhost:5499, stopped) is available for reuse: `docker start
cms-iso-test-pg`, then point `DATABASE_URL` at it or export it for the run.
