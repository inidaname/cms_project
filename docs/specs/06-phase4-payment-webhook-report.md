# Phase 4 Report — Checkout, Payment, and Webhook Correctness (prompt 3)

Status: **implemented and validated 2026-11-19**.

## Findings and fixes

| # | Finding | Fix |
|---|---------|-----|
| 1 | **Payment initiation was fundamentally broken**: `sales_id: cart_id` stored the cart's id in the `Payments.sales_id` FK, which references `Sales` — every real initiation FK-violated and returned 500 | `initiateCheckoutPayment` now resolves the **sale created by checkout** (`sales.findFirst({ cart_id, tenant_id })`, tenant-scoped) and attaches the payment to it; a cart without a checkout gets an explicit 400 (`TEM9004` "Cart has not been checked out yet") |
| 2 | Client-supplied `amount` silently **overrode the cart total** (pay-what-you-want on a cart checkout) | The cart total is authoritative. A supplied `amount` that differs from the total is rejected with an explicit 400 (`TEM9005` "Amount does not match the cart total") — never silently rounded or converted |
| 3 | Payment initiation had **no idempotency**: concurrent or repeated initiations either double-called the provider or died on the `sales_id` unique constraint with a 500 | Idempotent initiation: existing payment is checked **before** any provider call — `Success` → 409 (`TEM9006`, completed is terminal), `Pending/Failed` → 409 with the existing payment (`TEM9007`); a lost creation race (P2002) is caught and returns the same explicit 409. One payment row per sale, always |
| 4 | Webhook deliveries could **regress terminal states**: a late `FAILED` after `COMPLETED` downgraded a paid payment back to `Failed`/`Pending`; a late `COMPLETED` flipped a `Returned`/`Cancelled` sale back to `Paid`; an `Abandoned` cart could be forced to `Checkedout` | Explicit **terminal-state policy** implemented in the webhook handler: `Success` is terminal for payments (downgrades are logged and skipped; `Failed → Success` recovery and `Pending` transitions remain allowed); sales only move to `Paid` from `null`/`Paid` (never from `Returned`/`Cancelled`); carts only move to `Checkedout` from `Active` (guarded `updateMany` writes) |
| 5 | Two concurrent checkouts of the same cart: the loser died with a P2002 **500** | `checkout` catches the `sales.cart_id` unique-constraint race and returns an explicit **409** "This cart has already been checked out" |
| 6 | Unknown/replayed webhook behavior | Already correct from Phases 1–3 (mandatory signature verification, deterministic tenant secret, tenant-scoped writes, no writes for unknown payments, replay-safe state set); extended tests now pin the ordering/replay semantics |

## State policies (documented for future phases)

- `Payments.status`: `Pending → Success | Failed`; `Failed → Success` (recovery)
  allowed; `Success` is **terminal** (no downgrade).
- `Sales.status`: checkout creates the sale; `Paid` is set only from
  `null`/`Paid` by the webhook; `Returned`/`Cancelled` are admin-controlled
  terminals that webhooks never override.
- `Cart.status`: `Active → Checkedout` at checkout (Phase 2 fix) and on
  confirmed payment; `Abandoned` carts are never resurrected by webhooks.
- One `Payment` per `Sale` (schema unique constraint), enforced idempotently
  at the initiation boundary.

## Known limitation (documented, not changed)

Monetary values are `Float`/`DoublePrecision` columns (Prisma schema).
Application code performs no rounding or currency conversion, but moving to
a decimal representation would require a `schema.prisma` change and a
migration — deferred pending approval (migrations are never run by the
agent).

## Node/Worker parity

Checkout, payments, and webhook handlers are the shared route modules
mounted through the Worker shim — there is no second implementation to
drift. The only runtime-specific route is the Worker's native `/upload`
(Phase 5 scope).

## Tests

- Extended `test/routes/webhook-payment.test.ts`: late `FAILED` webhook
  cannot downgrade a completed payment; late `COMPLETED` webhook cannot
  resurrect a `Returned` sale; existing success/failure/replay/unknown/
  signature/staleness cases.
- New `test/routes/payment-initiation.test.ts` (pre-provider guards only, no
  network): requires checked-out cart, rejects amount mismatch, idempotent
  per sale (409, no duplicate row), rejects after completion, rejects
  foreign-tenant carts (404).

## Validation results

- `npm run build:ts`, `npm run typecheck:worker`, `npx tsc -p test/tsconfig.json` — pass
- Full suite: **81/81 pass, exit 0**
