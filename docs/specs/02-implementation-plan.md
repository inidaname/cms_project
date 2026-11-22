# Implementation Plan: Prompts 1–7

This plan sequences the prompts in [01-draft-prompts.md](./01-draft-prompts.md)
following the ordering required by prompt 8:

1. Fix security and tenant-isolation bugs that could expose or mutate data.
2. Add the test harness needed to prevent regressions.
3. Repair checkout/webhook/upload and provider behavior.
4. Normalize API contracts.
5. Improve flexibility and deployment parity.

Each work item below lists affected files, existing behavior, intended
behavior, compatibility requirements, test commands, and rollback strategy.
Work is delivered in small, reviewable phases; implementation of each phase
requires explicit approval and stops when its acceptance criteria are verified.

## Current state snapshot (verified 2026-11-18)

- `src/plugins/check-tenant.ts` resolves tenants via `x-api-key`, enforces
  tenant status, and checks bearer tokens only for `/admin`-prefixed routes;
  public routes are matched with `url.startsWith(...)`.
- `src/plugins/jwt-plugin.ts` signs JWTs with a fallback secret
  (`process.env.JWT_SECRET || "JWT_SECRET"`).
- `src/worker/middleware/check-tenant.ts` re-implements tenant resolution for
  the Worker; `src/worker/routes/index.ts` maps route modules.
- Uploads: `src/routes/upload/routes.ts` (54 lines) vs the Worker `/upload`
  route registered directly in `src/worker/`.
- `src/core/webhook/webhook-handler.ts` (135 lines) and
  `src/core/finecore/finecore-client.ts` (76 lines) handle provider webhooks
  and payment calls.
- Tests today are minimal: `test/routes/example.test.ts`,
  `test/routes/root.test.ts`, `test/plugins/support.test.ts`. There are no
  tenant fixtures, isolation tests, or checkout/webhook tests.
- `prisma/schema.prisma` (613 lines) holds all tenant-owned models.

---

## Phase 1 — Tenant isolation (prompt 1)

**Goal:** no tenant-owned read or write can succeed without a validated
`tenant_id` scope; every exemption is explicit and documented.

- **Affected files:** `src/plugins/check-tenant.ts`,
  `src/worker/middleware/check-tenant.ts`, `src/core/**` (services with
  Prisma queries), `prisma/schema.prisma` (read-only audit),
  `src/middleware/**`, `test/routes/*` (new isolation tests).
- **Existing behavior:** bearer-token tenant/role check runs only for
  `/admin` routes; public-route matching uses prefix `startsWith`, which is
  coarse; tenant lookup attaches `tenantFinecoreConfig` and
  `tenantEmailConfig` (credentials) to `req.tenant` for every request;
  per-service `tenant_id` scoping is not uniformly audited.
- **Intended behavior:**
  - Extract a shared tenant-scoping helper used by both Node and Worker paths
    so the rules cannot drift.
  - Replace coarse prefix matching with an explicit route-exemption list that
    documents why each route is public (onboarding, webhook, invite accept,
    docs/health).
  - Audit every tenant-owned Prisma operation in `src/core/**` for
    `tenant_id` constraints, including nested relations, aggregates, and
    super-admin impersonation actions.
  - Avoid attaching provider credential configs to `req.tenant` unless the
    route needs them (least privilege).
  - No speculative schema changes; no response-shape changes.
- **Compatibility:** HTTP contracts unchanged. Exemption list must cover the
  same routes as today; any behavioral tightening (e.g. a route that was
  accidentally public) is listed in the phase report.
- **Tests:** two-tenant fixtures; for each protected area (users, products,
  carts, sales, payments, projects, campaigns, team, notifications,
  settings) prove tenant A cannot read or mutate tenant B.
  - Focused: `node --test test/routes/isolation.test.ts` (name per harness
    conventions established in Phase 2; before that exists, use ad-hoc
    Node test files run with the repo's test runner).
- **Validation:** `npm run build:ts`, `npm run typecheck:worker`, `npm test`.
- **Rollback:** single PR per confirmed fix area; no feature flag needed for
  bug fixes (they are security corrections), but each fix is separately
  revertable.

## Phase 2 — Test harness and tenant fixtures (prompt 5)

**Goal:** reusable, deterministic fixtures so every later phase can prove
behavior instead of asserting it by inspection.

- **Affected files:** new `test/support/` (tenant/role/token/api-key
  fixtures), `test/routes/**` expanded, possibly `package.json` test script
  only if needed to wire globs.
- **Existing behavior:** only `example.test.ts`, `root.test.ts`, and
  `support.test.ts` exist; no database-seeded multi-tenant fixtures.
- **Intended behavior:**
  - Fixtures for ≥2 tenants, OWNER/ADMIN/USER roles, active/suspended
    tenants, valid/invalid API keys and JWTs.
  - Deterministic setup/teardown that is safe to rerun.
  - Use existing Node test runner + fastify helper patterns from
    `test/plugins/support.test.ts`; add no new dependency unless justified.
  - Coverage priority per prompt 5: isolation → auth/role enforcement →
    product/cart/checkout/sale transitions → payment/webhook verification →
    uploads → team invites/impersonation → subscribers/campaigns.
  - Tests named by behavior.
- **Compatibility:** none; test-only.
- **Tests:** `npm test` (the harness itself runs here).
- **Validation:** `npm run build:ts`, `npm test`.
- **Rollback:** trivially revertible; no runtime code touched.

## Phase 3 — Auth and credential hardening (prompt 2)

**Goal:** no fallback secrets in production; no secrets or token internals in
responses; tokens hashed, single-use, scoped, and expiring.

- **Affected files:** `src/plugins/jwt-plugin.ts`, `src/core/auth/**`,
  `src/core/super-admin/**`, `src/core/admin/team-service.ts`,
  `src/core/finecore/**` (credential storage, webhook signature inputs),
  `src/core/tenants/**` (API key generation/handling), `.env.example` (new or
  updated), `prisma/schema.prisma` only if token hashing needs a field change.
- **Existing behavior:** JWT secret falls back to the literal string
  `JWT_SECRET`; access tokens expire in 15m; refresh/reset/invite token
  storage and expiry to be verified during the audit.
- **Intended behavior:**
  - Fail fast at startup in production when `JWT_SECRET` (and other
    security-critical env vars) are missing; keep a non-production fallback
    only for local dev, clearly logged.
  - Verify password/reset/invite tokens are hashed and single-use; scope
    reset tokens to the tenant; consistent expiry.
  - Ensure login/registration/refresh/me responses never include password
    hashes, refresh-token internals, API keys, or provider secrets.
  - Review provider credential storage (Finecore/email configs) and webhook
    signature verification inputs.
  - Never print secrets in logs.
- **Compatibility:** preserve access/refresh token behavior unless a security
  issue requires change; if token storage format changes (e.g. hashed reset
  tokens), ship a compatibility path that accepts in-flight plaintext tokens
  during a deprecation window, then document the cutover. Any
  `schema.prisma` change is presented to the user first with the exact
  command to run (migrations are never generated by the agent).
- **Tests:** invalid JWTs, wrong-tenant tokens, expired refresh/reset tokens,
  replayed team invites, missing production configuration, response-shape
  leak checks.
  - Focused: `node --test test/routes/auth*.test.ts test/routes/team*.test.ts`
- **Validation:** `npm run build:ts`, `npm run typecheck:worker`, `npm test`.
- **Rollback:** env-var gating (fail-fast only in production) keeps dev
  flows working; each token-format change ships behind a documented
  compatibility window.

## Phase 4 — Checkout, payment, and webhook correctness (prompt 3)

**Goal:** idempotent, tenant-safe cart→sale→payment flow with explicit state
transitions and replay-safe webhooks.

- **Affected files:** `src/core/carts/**`, `src/core/sales/**`,
  `src/core/payments/**`, `src/core/finecore/**`,
  `src/core/webhook/webhook-handler.ts`, `src/routes/checkout/**`,
  `src/routes/payments/**`, `src/routes/webhook/**`, `src/worker/**`.
- **Existing behavior:** webhook handling and payment status updates in one
  service layer; race/replay/idempotency guarantees to be verified in the
  audit (candidate gaps: duplicate webhook deliveries, concurrent checkout of
  the same cart, non-terminal status overwrites).
- **Intended behavior:**
  - Explicit, documented state machines for checkout/payment/sale status with
    a terminal-state reconciliation policy.
  - Webhook verification selects the correct tenant secret and rejects
    missing, malformed, stale, replayed, or mismatched signatures.
  - Idempotency keys or unique constraints so repeated/reordered webhooks
    cannot duplicate records or regress terminal states.
  - Monetary values in a safe representation; no silent rounding/currency
    conversion.
  - Node and Worker produce equivalent behavior.
  - Provider stays Finecore; only abstractions needed for predictability and
    testability are added.
- **Compatibility:** no provider swap; HTTP contracts unchanged except where
  a bug requires a documented fix. If a DB unique constraint is needed for
  idempotency, propose the `schema.prisma` change and the exact command for
  the user to run; preserve existing data with a compatibility plan.
- **Tests:** success, replay, failure, unknown payment, signature errors,
  cross-tenant checkout/payment attempts, concurrent checkout.
  - Focused: `node --test test/routes/checkout*.test.ts test/routes/payments*.test.ts test/routes/webhook*.test.ts`
- **Validation:** `npm run build:ts`, `npm run typecheck:worker`, `npm test`.
- **Rollback:** state-machine and idempotency changes land in separate PRs;
  new unique constraints are additive (no destructive migration); Worker and
  Node changes ship together to preserve parity.

## Phase 5 — Upload parity and media safety (prompt 4)

**Goal:** Node and Worker `/upload` behave identically and safely.

- **Affected files:** `src/routes/upload/routes.ts`, `src/worker/**` (upload
  route), `src/plugins/raw-body.ts`, `src/core/**` if media metadata is
  stored, `wrangler.jsonc` (env docs only).
- **Existing behavior:** Node route is 54 lines; Worker registers `/upload`
  directly. Exact contract differences (size enforcement points, type checks,
  error shapes) to be captured in a comparison table during the audit.
- **Intended behavior:**
  - Exactly one file in `file`; reject extra files/fields; 10 MiB limit
    enforced at both metadata and streamed-data boundaries.
  - Content-type allowlist for normal storefront assets; reject unexpected
    types.
  - Opaque server-generated object keys; client filename never trusted
    (no path traversal).
  - Tenant/actor context preserved on stored metadata.
  - Consistent error/success shapes on both runtimes; documented 503 when R2
    configuration is missing/failing.
  - Evaluate whether signed/private URLs are needed; no image transformation.
- **Compatibility:** success response shape (key, content type, size, CDN
  URL) preserved; only divergent error cases are normalized, with the
  normalization documented first.
- **Tests:** missing file, extra fields/files, size limits (metadata and
  stream), malformed multipart, allowed types, disallowed types, path
  traversal attempts, public URL generation, R2 failure → 503 — run against
  both Node and Worker paths.
  - Focused: `node --test test/routes/upload*.test.ts`
- **Validation:** `npm run build:ts`, `npm run typecheck:worker`, `npm test`.
- **Rollback:** Node and Worker route changes in one PR (parity cannot be
  half-shipped); no data migration; R2 keys already written by the old code
  remain valid.

## Phase 6 — API contracts and OpenAPI consistency (prompt 7)

**Goal:** schemas match handler behavior; sensitive fields absent from
response schemas; pagination consistent; Swagger/Scalar and Node/Worker route
maps in parity.

- **Affected files:** `src/routes/**` (schema definitions),
  `src/core/*/*.schema.ts`, `src/utils/**` (swagger/response helpers),
  `src/worker/routes/index.ts` (route map parity).
- **Existing behavior:** AJV schemas alongside route modules; Swagger at
  `/docs`, Scalar at `/documentation`; consistency of success/error shapes,
  pagination, UUID/enum formats to be verified per route.
- **Intended behavior:**
  - Consistent success/error status shapes; documented authorization/tenant
    requirements per route; pagination/filtering contracts for list
    endpoints; UUID/enum formats validated; sensitive fields (passwords,
    refresh tokens, API keys, provider secrets) absent from reusable
    response schemas; request/response limits documented.
  - Route additions/removals reflected in both Worker and Fastify maps.
- **Compatibility:** no casual client breakage; for inconsistent response
  shapes, document the cases first, then normalize only the agreed scope.
  Swagger generation must succeed before and after.
- **Tests:** representative success and error response-shape assertions per
  route family (reuses Phase 2 fixtures).
  - Focused: `node --test test/routes/contracts*.test.ts` (or per-family
    files as they land)
- **Validation:** `npm run build:ts` (includes Prisma generate +
  compilation), `npm run typecheck:worker`, `npm test`.
- **Rollback:** contract changes grouped by route family in separate PRs;
  each documents before/after shapes so a revert is mechanical.

## Phase 7 — Provider and cache flexibility (prompt 6)

**Goal:** smallest provider-facing interfaces for Finecore (payments),
Resend/Nodemailer (email), Redis/KV (cache), and R2 (storage), selected by
configuration; Node and Worker adapters share one contract.

- **Affected files:** `src/core/finecore/**`, `src/core/payments/**`,
  email paths in `src/core/**` (campaign/subscriber sends), cache in
  `src/plugins/cache.ts` + `src/plugins/cache-kv.ts`, storage in upload
  routes, `src/plugins/support.ts` / env handling, `.env.example`.
- **Existing behavior:** direct provider assumptions in handlers/services;
  two cache implementations (Node and KV) exist side by side.
- **Intended behavior:**
  - Minimal interfaces derived from what current services actually call.
  - Centralized environment validation and provider selection.
  - In-memory/fake providers for unit tests.
  - Email delivery remains best-effort where documented; provider failures
    never silently succeed or leak credentials.
  - Missing provider configuration has explicit startup or request-time
    behavior.
- **Compatibility:** public HTTP contracts and default behavior unchanged;
  only internals move behind interfaces.
- **Tests:** unit tests with fake providers for payment initiation/refund,
  email send paths, cache read/write, storage put/delete.
  - Focused: `node --test test/plugins/*.test.ts test/routes/payments*.test.ts`
- **Validation:** `npm run build:ts`, `npm run typecheck:worker`, `npm test`.
- **Rollback:** interfaces are additive; default implementations remain the
  current providers, so reverting any single adapter is safe.

---

## Cross-phase rules

- One phase at a time; approval gates before each phase and before each
  `schema.prisma` change (agent never runs or generates migrations).
- Every phase ends with: focused tests → `npm run build:ts` →
  `npm run typecheck:worker` (when Worker code changed) → `npm test` when
  feasible, plus a short phase report (what changed, compatibility notes,
  any routes whose behavior tightened).
- Directly related spec updates (`docs/specs/`) accompany each phase.
- No new dependencies without stated justification; no secrets or `.env`
  values read, printed, or committed.
- Prompt 9 (flexible product/offering domain) is intentionally out of scope
  for this plan; it is a separate design effort to be proposed after (or in
  parallel with, if requested) Phases 1–7, since it changes the Prisma schema
  and benefits from the isolation and test groundwork above.
