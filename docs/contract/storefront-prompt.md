# Prompt — Merchant Storefront Frontend Integration

Use this prompt to build (or retrofit) the customer-facing storefront on top
of the Possible CMS API. The API is multi-tenant: every tenant is one
storefront. Contract artifacts: `docs/contract/openapi.json`,
`docs/contract/postman_collection.json` (folder "Setup" first).

```text
You are building the customer-facing storefront for a tenant of the Possible
CMS platform (a multi-tenant commerce backend). The backend is complete and
is the source of truth; do not propose backend changes in this task unless a
contract gap is confirmed against docs/contract/openapi.json.

## Runtime and configuration

- Backend base URL: configurable per environment (dev: http://localhost:7373).
- The storefront is bound to exactly ONE tenant. Its `x-api-key` is a
  build-time/deployment secret injected server-side or via env:
  `NEXT_PUBLIC/VITE_API_BASE_URL` and the tenant API key must never be
  bundled into public client bundles if the deployment can proxy — prefer a
  thin backend-for-frontend (BFF) route that attaches `x-api-key` and manages
  customer JWTs, so the key and tokens are not exposed to the browser.
- CORS is enabled on the API (all origins) for development; still prefer the
  BFF pattern for production.

## Authentication model (customer-facing)

- Customers register and log in against the tenant:
  - `POST /auth/register` (body: email, password, name, phone?) — first user
    of a tenant becomes OWNER; storefront registrations are `USER` role.
    Response: `{ status, data: { accessToken, refreshToken, user } }`.
  - `POST /auth/login` — same shape. 401 for unknown users and wrong
    passwords uses the SAME message (no account enumeration).
  - `POST /auth/refresh-token` — rotation: the old refresh token is invalid
    after use; store the new one from every refresh. Access tokens live 15m.
  - `POST /auth/logout` — revokes the given refresh token (ownership-checked).
- Every customer request needs BOTH headers:
  - `x-api-key: <tenant key>` (tenant identity)
  - `Authorization: Bearer <accessToken>` (must belong to that tenant;
    cross-tenant tokens are rejected with 403 "Token does not belong to this
    tenant").
- The profile endpoint is `GET /users/` (self) and `PUT /users/` (name/phone).

## Catalog

- `GET /product/?page&limit&filter` — paginated list for the tenant:
  `{ data: { data: Product[], metadata: { total, page, limit, totalPages,
  hasNextPage, hasPrevPage } } }`.
- `GET /product/{product_id}` — detail. The response is additive to the
  base product: if the merchant configured a flexible offering it may
  include option groups (with choices) and slots. Build the configurator
  UI generically from this data:
  - `optionGroups[]`: `{ id, name, required, min_select, max_select,
    choices: [{ id, label, price_delta, active }] }` — render required
    groups prominently, enforce min/max client-side AND rely on server
    validation (400 messages are user-safe, e.g. "Option group \"Extras\"
    allows at most 2 selection(s)").
  - Slots (`OfferingSlot`): `{ id, startsAt, endsAt, capacity, bookedCount,
    location }` — render as bookable times; only future slots are
    selectable (server rejects past/full ones).

## Cart

- Carts belong to the logged-in customer and the tenant. A cart is created
  implicitly: `POST /carts/items/{cart_id?}` (cart_id optional — omit it and
  the backend reuses the customer's active cart; you may still want an
  explicit cart via `POST /carts/` for multi-cart UIs).
- Add item payload:
  - Simple: `{ product_id, product_quantity, variation_id? }`.
  - Configurable offerings: add
    `selections: { groups: [{ group_id, choices: [{ choice_id, quantity }] }],
    slot_id?, participants? }`.
  - The server snapshots the validated selection and prices the line
    deterministically: unit = (variation | base) + Σ price_delta × qty.
    Display prices from the cart response, not from catalog guesses.
- Other operations: `GET /carts/` (list), `GET /carts/items/cart/{cart_id}`,
  `PUT /carts/items/{item_id}` (quantity), `DELETE /carts/items/{item_id}`,
  `PUT /carts/c/status/{cart_id}` (Abandoned), cart delivery fields
  (`notes`, `recipientName`, `recipientPhone`, `deliveryAddress`,
  `deliveryType`: PICKUP | DELIVERY | SHIPPING).
- Never mutate cart money client-side; the cart total is authoritative.

## Checkout and payment

- `POST /checkout/` `{ cart_id }` — converts the cart into a sale. Guarded:
  404 (cart not found/inactive), 409 (already checked out — treat as
  "refresh and continue"), 400 (empty cart). The sale snapshots the
  purchase-time configuration and prices; later catalog changes never alter
  an existing order.
- Payment is via Finecore hosted checkout:
  `POST /payments/checkout-link`
  `{ cart_id, success_url, cancel_url }` →
  `{ data: { payment, checkout: { checkoutUrl, checkoutToken, amount,
  currency, expiresAt } } }` — redirect the customer to `checkoutUrl`
  (success_url/cancel_url must be absolute URLs on the storefront).
  - Requirements: the cart must be CHECKED OUT first (the payment attaches
    to the sale). Initiation is idempotent per sale: repeating it returns
    409 with the existing payment — do not double-redirect.
- After payment, status is asynchronous: poll
  `GET /payments/verify/{reference}` (tenant + user scoped) or list
  `GET /payments/?page&limit&filter=Success|Failed|Pending`. On the
  success_url page, always re-verify via the API instead of trusting query
  params.
- Order history: `GET /checkout/` and `GET /checkout/{sale_id}` (scoped to
  the customer; a different user of the same tenant gets null, not the
  order).

## Errors and UX conventions

- All responses: `{ status: "success" | "error", message?, code?, data? }`.
  Error codes are stable strings (e.g. TEM4002, TEM9003) — map them to
  friendly copy, fall back to `message`.
- 401 → refresh flow once, then redirect to login. 403 → show permission
  copy (tenant suspended has a distinct message: "This store is currently
  suspended").
- Rate limiting is 100 req/min per customer (429 with `Retry-After` header
  and `X-RateLimit-Reset`); implement a backoff, not a hard error page.

## Acceptance criteria

- Storefront works for: standalone product, configurable bundle (min/max
  enforced with friendly errors), booked offering (slot + capacity),
  simple cart, checkout, hosted payment, and post-payment verification.
- Customer A can never see customer B's carts/orders (verified by scoped
  endpoints; the UI never needs cross-user fetches).
- No tenant API key or customer JWT in URLs or logs; tokens stored per the
  platform's session policy.
- All money displayed comes from API responses (never recomputed locally).
- Build passes with no new backend changes; any contract mismatch is
  reported against `docs/contract/openapi.json`, not patched around.
```
