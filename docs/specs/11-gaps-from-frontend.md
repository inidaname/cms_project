# Project Gaps

Here some of the Gaps documented on the frontend

- Admin Platfomr
- Merchant Admin
- Storefront## Contract mismatches found (reported, not patched)

### Admin Platform

1. `SUSPENDED` present in the status-update enum but missing from the
   tenant schema status enum; update endpoint treated as authoritative
   (overview also counts suspended tenants).
2. All five tenant sub-list endpoints declare `200 {}` (no schema); no
   Postman examples. Row types reflect the fields the console renders.
3. `GET /super-admin/users` body undocumented (`200 {}`).
4. Audit-log endpoints: no documented detail/metadata fields; only
   `filter` search is documented — no structured filters offered.
5. Impersonation response documented, but there is no documented secure
   cross-app handoff endpoint — the in-memory vault documents the
   integration requirement instead of pretending a handoff is complete.

### Merchant Admin

## 2. Contract mismatches to report (not patch)

1. **No `GET /admin/orders/{id}`** exists in the contract. A dedicated order
   detail view cannot be backed by a real endpoint; detail data must come from
   list-row responses, or the backend must add the route. UI will not invent
   one (Phase 6).
2. **No report-export endpoint** exists. No fake download/export UI will be
   built (Phase 3).
3. Login response shape (`data.accessToken` / `data.refreshToken` /
   `data.user`) matches the existing `LoginResponse` type — no mismatch.
4. `POST /tenants/onboard` used by `useOnboardMutation` exists in the
   contract; `/auth/register` also exists but is unused. Registration
   currently goes through onboarding — verify intended flow during Phase 1
   review.

### Merchant Storefronts

#### Storefront 01

1. **Confirmed mismatch (fix client):** `GET /payments/` is paginated —
   `data: { data: Payment[], metadata }` — the client typed it as
   `Payment[]`.
2. **Confirmed mismatch (fix client):** the checkout response is a _sales_
   object with `amount` and status enum
   `Delivered | Paid | Returned | Cancelled` — not `totalValue`/"Checkedout".
3. **`GET /checkout/` (order history) has no documented response schema.**
   The 200 response carries no schema; only `POST /checkout/` documents a
   _single_ sales object (`def-9`). The storefront normalizes
   array-or-single explicitly, citing this gap in code and tests.
4. **Documented gap:** `GET /carts/` has no response schema at all (`{}`).
   The client's `Cart[]` assumption is recorded as a documented assumption.
5. **Confirmed mismatch (fix docs):** `PUT /users/` accepts `name` only per
   OpenAPI; `docs/specs/storefront-prompt.md` claims name/phone. Docs are
   aligned to the contract; `phone` stays listed as an unresolved gap
   (register does accept `phone`).
6. **Documented gaps (unchanged, now written into the spec):** cart delivery
   fields have no documented mutation endpoint; the checkout-link 409
   response shape (existing payment) is undocumented; the hosted checkout's
   return query-parameter names are undocumented (the storefront reads
   `reference` but never trusts it).
7. **Note:** the response envelope's `status` enum includes `"warning"`
   (def-1); the BFF passes warnings through as success-shaped data and the
   client treats them as success. Recorded in the contract test.

#### Storefront 02

| #   | Gap                                                                                                                            | Disposition                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cart delivery fields (`notes`, `recipientName`, `recipientPhone`, `deliveryAddress`, `deliveryType`) have no mutation endpoint | **Open — backend coordination.** Not faked; delivery collection deferred until an endpoint exists                                                             |
| 2   | `GET /carts/` response schema is `{}`                                                                                          | **Open — backend confirmation.** Assume `Cart[]`, normalized explicitly                                                                                       |
| 3   | `GET /checkout/` order-history response undocumented                                                                           | **Open — backend confirmation.** Array-or-single normalized explicitly (pinned by tests)                                                                      |
| 4   | Checkout-link 409 shape undocumented (existing payment's `checkoutUrl` unreachable)                                            | **Open — backend coordination.** UI shows message + order-history link; never guesses a URL (tested)                                                          |
| 5   | Hosted-checkout return parameters undocumented                                                                                 | **Open — backend confirmation.** `reference` read only for API verification; return params never treated as proof (tested)                                    |
| 6   | Envelope `status: "warning"` (`def-1`)                                                                                         | **Accepted.** Client treats non-`error` envelopes as success data; flagged for backend confirmation                                                           |
| 7   | Customer product detail (`def-5`) lacks `optionGroups`/`slots`/`variations` (admin-only today)                                 | **Open — backend coordination.** Storefront renders simple products; contract test pins the absence so a backend change triggers a UI review                  |
| 8   | `GET /product/` declares no parameters or response schema                                                                      | **Open — backend confirmation.** `page`/`limit` sent per the integration prompt; list envelope normalized per spec; `filter` typed but unused until confirmed |

---

# Backend dispositions (2026-11-22)

All backend-actionable gaps were fixed in this pass; both contract
artifacts (`docs/contract/openapi.json`, `postman_collection.json`) were
regenerated from the running app and verified. Validation: `tsc --noEmit`,
`typecheck:worker`, `tsc -p test/tsconfig.json` clean; full suite
**151/151 pass**.

## Admin Platform

1. **SUSPENDED in tenant status enum — FIXED.** The shared tenant schema
   now carries the full status enum
   (`ACTIVE | SUSPENDED | EXPIRED | DELETED | OUTDATED | ABANDONED`),
   matching the status-update endpoint.
2. **Tenant sub-list schemas — FIXED.** All five sub-list endpoints
   (users/products/orders/payments/audit-logs) now declare
   `200 { status, data: { data: [...], metadata } }` with per-row shapes
   matching the service selects (products/orders use permissive row schemas
   to preserve rich relations).
3. **`GET /super-admin/users` — FIXED.** Documented: paginated cross-tenant
   users with `tenant: { id, name, domain }` attribution.
4. **Audit logs — FIXED.** Both platform and tenant-scoped audit-log
   endpoints now document the full row shape (action/entity enums, `details`
   JSON, ip/user-agent, actor `user`, resolved `tenant` name). Structured
   filters remain `filter` (free-text over action/entityType, per the
   service); richer structured filters would be a service change and were
   not added in this pass.
5. **Impersonation handoff — DECISION DOCUMENTED (no new endpoint).** The
   secure handoff stays an integration pattern (one-time handoff page →
   dashboard session, `impersonated: true` banner, tokens never persisted),
   as described in `docs/contract/platform-admin-prompt.md`. A dedicated
   backend handoff endpoint would need a product decision and was out of
   scope.

## Merchant Admin

1. **`GET /admin/orders/{id}` — ADDED.** New route + schema returning the
   sale with customer, payments, delivery, and cart lines (with frozen
   configuration snapshots); 404 when not in tenant.
2. **Report export — ACCEPTED GAP.** No CSV/export endpoint exists; adding
   one is a feature decision (file format, scope, streaming) and was not
   built. The dashboard must not fake a download.
3. Login response shape — confirmed matching; no action.
4. Registration via onboarding — confirmed intended (onboard creates the
   tenant + OWNER; `/auth/register` serves member/customer registration
   inside an existing tenant); no action.

## Storefronts

1. Payments pagination — client fixed; contract already documented it.
2. Checkout response is a sales object — client fixed; contract documents
   it.
3. **`GET /checkout/` order history — FIXED.** Response schema added:
   paginated `{ data: [...], metadata }` with rows documented as sales
   records plus cart (with frozen configuration snapshots), payments, and
   `paidBy` customer. The array-or-single normalization can now be retired
   to plain array handling.
4. **`GET /carts/` — FIXED.** Response schema added: paginated carts
   (rows documented as `cart#` fields plus cart items), with
   `?page/limit/filter=Active|Abandoned|Checkedout`.
5. **`PUT /users/` — FIXED.** Body schema now documents `name`, `email`,
   and `phone` (matching the service whitelist). The storefront prompt's
   claim is now contract-backed.
6. **Cart delivery-field mutation — FIXED.** New route
   `PUT /carts/c/{cart_id}` (customer-owned, tenant-scoped) accepting
   `notes`, `recipientName`, `recipientPhone`, `deliveryAddress`,
   `deliveryType` — the previously commented-out `updateOrderDetails`
   contract, now live.
   **Checkout-link 409 — FIXED.** `POST /payments/checkout-link` now
   documents the 409 shape (`data.payment` = existing payment) with the
   recovery instruction: verify/resume via
   `GET /payments/verify/{payment.reference}`.
   **Hosted-checkout return parameters — DOCUMENTED.** The 409/201
   descriptions state that return parameters are provider-controlled and
   the only verification input is the payment `reference` — never proof of
   payment.
7. **Envelope `status: "warning"` — ACCEPTED & DOCUMENTED.** The base
   response schema already declares the enum; warnings pass through as
   success-shaped data. No backend change.
8. **Customer product detail — FIXED.** `GET /product/{product_id}` now
   includes `optionGroups` (with choices), `offeringSlots`, and
   `productVariations` in its response (documented in the shared product
   schema). The storefront can render configurators and bookable slots from
   the customer-facing detail endpoint.
9. **`GET /product/` — FIXED.** Now declares `?page&limit&filter` and the
   paginated response envelope (`metadata` uses the shared pagination
   schema). Row items are documented as permissive objects because the
   handler returns product rows with merchant relations; a strict schema
   would have silently stripped data (Phase 6 lesson).

### Follow-ups deliberately not done

- Structured audit-log filters (would need service changes) — `filter`
  documented as-is.
- Report/export endpoints — product decision required.
- A dedicated impersonation handoff endpoint — pattern documented instead.
- **Reminder:** the offering-domain migration (`add_offering_domain`) and
  any future ones still need to run on the Neon database once it is
  reachable; the Docker test Postgres is fully migrated.
