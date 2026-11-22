# Phase 1 Proposal — Tenant Isolation Fixes (prompt 1)

Status: **implemented and validated 2026-11-19** (all fix groups A–E; see
"Implementation report" at the bottom).

Sources: full audit of `src/core/**` Prisma operations and the Node/Worker
tenant-middleware comparison (2026-11-18). Schema facts from
`prisma/schema.prisma`. The Phase 1 plan is in
[02-implementation-plan.md](./02-implementation-plan.md).

## Confirmed cross-tenant access paths

### A. Middleware-level (both runtimes)

| ID | Finding | Location |
|----|---------|----------|
| A1 | Bearer tokens on non-admin routes are verified for signature only; `token.tenant_id` is never compared to the `x-api-key` tenant. Tenant-A JWT + tenant-B API key is accepted on `/users/*`, `/carts/*`, `/checkout/*`, `/payments/*`, `/tenants/finecore*`, product mutations, and Worker `/upload`. | `src/plugins/jwt-plugin.ts:19-29`, `src/plugins/check-tenant.ts:100-138` (admin only), `src/worker/middleware/check-tenant.ts:113-129` |
| A2 | Public-route exemptions use `startsWith` and run **before** API-key resolution: the whole `/webhook/*` namespace is key/token-free, and `/tenants/onboard`, `/admin/team/invite/accept`, `/super-admin/login*` would sweep any future nested path. | both check-tenant files, lines 5-16/27 and 7-18/30 |
| A3 | Worker rate-limit runs before `checkTenant`, so the 300-req admin budget never applies (admin routes always get the 100 budget). | `src/worker/index.ts:44,54` vs `src/worker/middleware/rate-limit.ts:21` |

### B. Confirmed cross-tenant reads/writes (HIGH)

| ID | Finding | Location |
|----|---------|----------|
| B1 | `GET /users/tenant/` drops `tenant_id` when no filter is passed — any tenant's API key lists **all** tenants' users. Same in the count used for pagination. | `src/core/users/user-service.ts:16-25, 67-79` |
| B2 | `POST /admin/lists/add-subscribers` / `remove-subscribers` / `POST /admin/campaigns/send` read and write `ListSubscriber` by body-supplied IDs with no tenant check — cross-tenant list membership and cross-tenant email targeting. | `src/core/admin/admin-service.ts:147-172, 229-249` |
| B3 | Admin product-variation CRUD (`add/update/delete`) uses body-supplied `product_id`/`variation_id` with no tenant scope. | `src/core/admin/admin-service.ts:345-369` |
| B4 | Admin bundle CRUD (`add_to_bundle`, `edit_bundle`, read-back) uses body-supplied parent/child IDs with no tenant scope. | `src/core/admin/admin-service.ts:372-396` |
| B5 | `PUT /admin/orders/delivery` looks up and updates `Delivery` by body-supplied `sales_id` with no `tenant_id`. | `src/core/admin/admin-service.ts:439-455` |
| B6 | `/webhook/finecore` is public with **optional** signature verification; when verification is skipped, payment lookup (`reference`/`finecoreTransactionRef`, unscoped) and payment/cart/sales updates mutate any tenant's records. Config fallback can select an arbitrary tenant's secret. | `src/core/webhook/webhook-handler.ts:43-50, 53-89, 99-113` |
| B7 | `POST /campaigns/:campaign_id/send` resolves subscribers via body `listId` unscoped — foreign-tenant subscribers get `EmailSend` rows. | `src/core/subscribers/subscribers-service.ts:343-365` |

### C. Tenant-override mass assignment (MED)

| ID | Finding | Location |
|----|---------|----------|
| C1 | `{ tenant_id, ...body }` spreads let request bodies **override** `tenant_id` (and status): cart create, subscriber/list/campaign create, notification + template create. | `src/core/carts/cart-handler.ts:98-102`; `src/core/subscribers/subscribers-handler.ts:70-74, 165, 299-302`; `src/core/admin/admin-handler.ts:1191-1194, 1222-1225` |
| C2 | `PUT /users/` forwards the raw body to `user.update` — a user can set `role` (mass assignment to OWNER/ADMIN) and `tenant_id`. | `src/core/users/user-service.ts:54-56` |
| C3 | `addItemToCart` requires only **one** valid tenant product; other body items (foreign product IDs) silently get cart rows; variation price lookup is unscoped, so a foreign variation ID injects a foreign unit price into the cart. | `src/core/carts/cart-service.ts:302-314, 321-323` |
| C4 | `POST /admin/notifications/send-template` resolves the recipient `user_id` from the body unscoped — emails can be sent to another tenant's users. | `src/core/admin/notification-service.ts:291` |

### D. Check-then-act (TOCTOU) and unscoped aggregates (MED)

| ID | Finding | Location |
|----|---------|----------|
| D1 | Product update/delete and variation create/update/delete pre-check ownership in the handler, then run the write unscoped by ID. Variations are worse: the pre-check is on `product_id` but the write uses `variation_id`, so a mismatched variation ID passes the check and mutates another tenant's variation. | `src/core/product/product-service.ts:67-78, 115, 152-177`; `src/core/product/product-handlers.ts:124-145, 256-269` |
| D2 | `getAllTenantProducts` pagination total is an unscoped `product.count()` (cross-tenant count leak + wrong metadata). | `src/core/product/product-service.ts:115` |

### E. LOW / dead code (cheap hardening included)

- `findSaleByCart(cart_id, tenant_id)` ignores its own `tenant_id` param (dead code) — `src/core/sales/sales-service.ts:10-12`.
- Unused `savePayment`/`getPaymentById` are unscoped passthroughs — `src/core/payments/payment-service.ts:11-16, 49-53`.
- `auth.updatePassword` updates user/password-token by ID without `tenant_id` (inputs are server-derived) — `src/core/auth/auth-service.ts:34-42`.
- `isProductBundle` count unscoped (guard-only) — `src/core/product/product-service.ts:11-17`.
- `src/middleware/tenant-loader.ts` is dead code with misleading stricter semantics — propose deleting it in this phase.

## Proposed fixes (no schema changes)

**A1 — tenant-bound bearer enforcement (both runtimes).** In `check-tenant`
(Node and Worker), after the tenant is resolved, verify any `Authorization`
bearer JWT and require `decoded.tenant_id === tenant.id`; roles are enforced
per route family (`/admin` → OWNER/ADMIN, `/super-admin` → SUPER_ADMIN,
storefront/user routes → any role of that tenant). Node ordering note:
`app.authenticate` currently runs before tenant resolution; the binding check
moves into `check-tenant` so both runtimes enforce the same rule at the same
lifecycle point. Result: cross-tenant token+key pairs are rejected 403
everywhere. **Behavioral tightening — previously-accepted cross-tenant
requests will now fail; this is the intended fix and will be documented.**

**A2 — exact-match public routes (both runtimes).** Replace the
`startsWith` exemption list with an exact match on pathname (plus explicit
`/docs` and `/docs/json` entries); keep the documented per-route exemption
reasons in a comment block shared conceptually between runtimes.
`/webhook/finecore` remains public; `/webhook/anything-else` will now require
an API key (none exists today, so no behavior change for current clients).

**A3 — Worker rate-limit ordering.** Move rate limiting after `checkTenant`
in `src/worker/index.ts` so the admin budget works; Node unchanged.

**B1 —** `getAllUsers`/`countTenantsUsers`: `tenant_id` always in the where
clause (filter becomes an additional condition).

**B2 —** Admin list/campaign subscriber operations: reuse the
`subscribers-service.ts` pattern — verify the list **and** every subscriber
belong to the tenant before touching `ListSubscriber`; scope the campaign-send
read through the tenant-owned list.

**B3/B4 —** Admin variation and bundle operations: constrain writes through
the parent product's `tenant_id` (Prisma relation filters, e.g.
`where: { id, product: { tenant_id } }`); reject child products that belong
to another tenant.

**B5 —** Delivery update: `where: { sales_id, tenant_id }` (and verify the
linked sales belongs to the tenant on create).

**B6 —** Webhook hardening (Phase 1 scope only): signature verification
becomes **mandatory** (reject missing/invalid/malformed signature, missing or
stale timestamp); the tenant secret is selected deterministically from the
referenced payment/config — no arbitrary-config fallback; payment lookup and
the downstream payment/cart/sales updates are constrained to the verified
tenant. Full idempotency/replay policy and terminal-state reconciliation
remain Phase 4.

**B7 —** Campaign send: resolve subscribers through a tenant-owned list
(`listId` validated against `tenant_id` before use).

**C1 —** Replace spreads with explicit data objects in the affected create
handlers (`tenant_id`/`user_id`/`status` can never come from the body).

**C2 —** `updateUser` whitelists updatable fields (name, phone, email, etc.);
`role`, `tenant_id`, `id`, `password` are never taken from the body.

**C3 —** Cart items: every product ID must be a tenant product (reject the
request otherwise — no partial insertion); variation lookup filtered through
`product: { tenant_id }`.

**C4 —** `sendFromTemplate` resolves the recipient with
`where: { id: user_id, tenant_id }`.

**D1 —** Product/variation writes move the tenant constraint into the write
itself (`where: { id, tenant_id }` / relation filters), eliminating the
check-then-act pattern; variation ID mismatch becomes a 404.

**D2 —** Pagination count scoped to `tenant_id`.

**E —** Scope the dead-code helpers by their existing parameters (no API
changes since they have no callers); tenant-scope `updatePassword` via the
token's `tenant_id`; delete `src/middleware/tenant-loader.ts`.

## Explicitly deferred (with reasons)

- **Webhook idempotency/replay-staleness policy and payment state machines** →
  Phase 4 (prompt 3); Phase 1 only makes verification mandatory and tenant-scoped.
- **Node upload route is broken** (Hono app cannot register as a Fastify
  plugin; `@fastify/multipart` never registered) → Phase 5 (prompt 4).
- **Worker KV rate-limit atomicity** → Phase 7 (prompt 6, cache providers).
- **Worker shim name-based `authenticate` detection** (`Function.name` check
  could silently drop JWT enforcement for differently-named hooks) → Phase 7
  (provider/adapter parity); noted in the phase report.
- **Node-vs-Worker route parity gaps** (`/`, `/ping`, `/health/db`, docs
  routes, `/health` payload) → Phase 6/7; no current isolation risk.

## Tests (focused, Phase 1)

Build a minimal two-tenant fixture on top of the existing
`test/helper.ts` (boots the full app; `app.inject` for requests):

- Seed tenants A and B (distinct API keys), one OWNER/USER each.
- Cross-tenant assertions: tenant-B JWT + tenant-A key (and the reverse) on
  `/users/tenant/`, `/carts/`, `/product/*`, `/carts/items`; unfiltered user
  listing returns only the key's tenant's users; admin variation/bundle/list/
  delivery operations with foreign IDs are rejected; cart item creation with
  a foreign product or variation ID is rejected; body `tenant_id`/`role`
  override attempts are ignored; webhook without a signature is rejected.
- Tests require a reachable `DATABASE_URL` (the configured dev/test
  database). Database state is created and cleaned by the fixture per run.

## Validation

- Focused: `node --test test/routes/isolation.test.ts` (plus the fixture file)
- Full: `npm run build:ts`, `npm run typecheck:worker`, `npm test`

## Rollback

## Rollback

Single phase PR (plus the fixture PR); each fix group (A, B, C, D, E) lands
as separate commits so any group can be reverted independently. No schema or
migration changes. The only intentional behavior changes are the A1/A2
tightenings, both documented here.

## Implementation report (2026-11-19)

All fix groups A–E were implemented and validated.

**Code changes:**
- `src/plugins/check-tenant.ts` + `src/worker/middleware/check-tenant.ts`:
  exact-match public-route sets with documented exemptions; bearer
  verification with `tenant_id` binding now runs for every protected route in
  both runtimes; admin role check preserved; error responses unchanged.
- `src/worker/index.ts`: rate limiting moved after `checkTenant` so the
  300-req admin budget applies; public-route coverage unchanged.
- `src/core/users/user-service.ts`: `getAllUsers`/`countTenantsUsers` always
  tenant-scoped; `updateUser` whitelists `email/name/phone/agreed` only.
- `src/core/webhook/webhook-handler.ts`: signature + timestamp mandatory;
  deterministic tenant resolution (payload metadata, else payment's tenant;
  arbitrary-config fallback removed); payment/cart/sales lookups and updates
  constrained to the verified tenant.
- `src/core/admin/admin-service.ts`: list add/remove + campaign send verify
  tenant-owned lists/subscribers; variation add/update/delete and bundle
  add/edit scoped through parent-product `tenant_id`; delivery
  find/update/create tenant-scoped with sale verification.
- `src/core/subscribers/subscribers-handler.ts`: create handlers pass
  explicit fields (no `tenant_id`/`status` override); campaign send resolves
  subscribers through a tenant-owned list.
- `src/core/carts/cart-handler.ts` + `cart-service.ts`: cart create takes
  explicit content fields only; cart item creation requires **all** products
  to be tenant products; variation prices resolved through tenant-owned
  products, foreign variation IDs rejected.
- `src/core/admin/admin-handler.ts` + `notification-service.ts`:
  notification/template creates use explicit fields; `sendFromTemplate`
  resolves recipients tenant-scoped.
- `src/core/product/product-service.ts` + `product-handlers.ts`: all
  product/variation/bundle writes carry the tenant constraint in the write
  itself (TOCTOU removed); variation-ID mismatch returns 404; pagination
  count tenant-scoped; `isProductBundle`/`editBundle` scoped.
- `src/core/sales/sales-service.ts`, `src/core/payments/payment-service.ts`,
  `src/core/auth/auth-service.ts` + `auth-handler.ts`: dead-code helpers
  scoped; `updatePassword` constrained by the token's `tenant_id`;
  `savePayment` refuses to write without a tenant.
- `src/middleware/` (tenant-loader.ts) deleted (dead code).

**Tests:** `test/support/tenants.ts` (two-tenant fixture with safe teardown)
and `test/routes/isolation.test.ts` — 16 behavior-named tests covering user
listing scope, cross-tenant token rejection (user + cart routes), admin
variation update/delete, product update, cart item foreign product/variation,
cart `tenant_id` body override, list membership foreign subscribers, webhook
missing/invalid signature, missing timestamp, webhook prefix no longer
exempt, and notification recipient scope.

**Validation results:**
- `npx tsc --noEmit` — pass
- `npm run build:ts` — pass
- `npm run typecheck:worker` — pass
- `npx tsc -p test/tsconfig.json` — pass
- `node --test -r ts-node/register test/routes/isolation.test.ts` (against a
  throwaway local Postgres seeded from `prisma/migrations/*/migration.sql`,
  because the configured Neon database was unreachable) — **16/16 pass**

**Known follow-ups:**
- The pre-existing route tests (`test/routes/root.test.ts`) fail at baseline
  under `ts-node` (global `PluginType` declaration not resolved) and hung
  before that on the unreachable DB — the test harness needs the Phase 2
  repair regardless of Phase 1 changes.
- `npm test` in full requires a reachable `DATABASE_URL`; the Neon endpoint
  was unreachable during this phase and must be restored or replaced.
- Throwaway test container `cms-iso-test-pg` (postgres:16-alpine on
  localhost:5499) was stopped, not removed, for reuse in Phase 2.
