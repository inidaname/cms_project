# Prompt — Merchant Dashboard Integration

Use this prompt to build the merchant (tenant) dashboard on top of the
Possible CMS API. Contract artifacts: `docs/contract/openapi.json`,
`docs/contract/postman_collection.json` (run the "Setup" folder first).

```text
You are building the merchant dashboard web app for a tenant of the Possible
CMS platform. The backend is complete and is the source of truth; do not
propose backend changes unless a contract gap is confirmed against
docs/contract/openapi.json.

## Runtime and configuration

- Backend base URL per environment (dev: http://localhost:7373).
- The dashboard belongs to ONE tenant: its `x-api-key` identifies the tenant.
  Store it server-side or via env — never in client-side bundles for
  production; a BFF route that attaches `x-api-key` and manages session
  tokens is preferred.
- All `/admin/*` routes require BOTH `x-api-key` AND a Bearer JWT with role
  OWNER or ADMIN (the middleware rejects USER tokens with 403 "Admin access
  required"). Cross-tenant tokens are rejected 403.

## Authentication and team

- `POST /auth/login` / `register` / `refresh-token` / `logout` — same
  semantics as the storefront: 15-minute access tokens, refresh rotation
  (store the new refresh token on every refresh), refresh on 401 once then
  force re-login.
- Team management: `GET /admin/team` (paginated members),
  `GET /admin/team/{user_id}`, `PUT /admin/team/{user_id}/role`,
  `DELETE /admin/team/{user_id}`, invites via `POST /admin/team/invite`
  (returns `{ inviteId, email, role, expiresAt, token }` — build the invite
  link `FRONTEND_URL/invite/accept?token=...`; the token is single-use,
  7-day expiry, hashed at rest), `GET /admin/team/invites`,
  `DELETE /admin/team/invites/{invite_id}`.
- Public invite acceptance (no auth): `POST /admin/team/invite/accept`
  `{ token, name, password }`.

## Catalog and flexible offerings

- Products: `GET/POST /product/`, `GET/PUT/DELETE /product/{product_id}`,
  variations at `/product/variation/...`, bundles via
  `POST /product/bundle/{product_id}` (legacy fixed-bundle path — keep
  working).
- Media: `POST /upload` (multipart, exactly one file in the `file` field,
  ≤ 10 MiB; allowed: jpeg/png/webp/gif/avif/pdf; server stores under an
  opaque key and returns `{ key, url, contentType, size }`). Validate size
  and type client-side too; 415/413/503 responses are documented.
- Flexible offering configuration (generic primitives, no industry fields):
  - `GET/POST/PUT/DELETE /admin/offering-types` — behavior flags
    (selectable, scheduled, participants, deliverable).
  - `POST/GET /admin/products/{product_id}/option-groups`,
    `PUT/DELETE /admin/option-groups/{id}`,
    `POST /admin/option-groups/{group_id}/choices`,
    `PUT/DELETE /admin/option-choices/{id}` — groups have
    required/min_select/max_select; choices have label/price_delta/active
    and may link a product.
  - `POST/GET /admin/products/{product_id}/slots`,
    `PUT/DELETE /admin/slots/{id}` — startsAt/endsAt/capacity/location;
    bookedCount is read-only and maintained by checkout.
  - Never invent industry-specific UI branches; the same forms serve every
    merchant type — only their configuration data differs.

## Orders, fulfillment, payments

- Orders: `GET /admin/orders` (paginated `{ data, metadata }`, includes
  customer, payments, delivery, cart lines with snapshots),
  `GET /admin/orders/{id}` (read via list/get action body contract — see
  collection), `PUT /admin/orders/status`, `PUT /admin/orders/delivery`
  (status: PENDING/PREPARING/OUT_FOR_DELIVERY/DELIVERED/FAILED; tracking
  number, estimated arrival, recipient fields).
- Payments: `GET /admin/payments`, refunds via the payments management
  actions (see collection "Admin" folder). Payment state transitions are
  webhook-driven; `Success` is terminal — the UI must not offer "unpay".

## Email marketing

- Subscribers: `GET/POST/PUT/DELETE /admin/subscribers` (+ bulk import).
- Lists: `GET/POST /admin/lists`, add/remove subscribers
  (`{ list_id, subscriber_ids }` → `{ added }` / `{ removed }`).
- Campaigns: `GET/POST/PUT/DELETE /admin/campaigns`,
  `POST /admin/campaigns/send` (`{ campaign_id, list_id? }` →
  `{ scheduled }`). Campaign status is backend-managed
  (DRAFT→SCHEDULED→SENDING→SENT/FAILED); the UI reflects, never sets, sent
  state directly.

## Insights and settings

- Dashboard/analytics: `GET /admin/dashboard`, `/admin/analytics/revenue`,
  `/admin/analytics/users`, `/admin/analytics/products`,
  `/admin/stats`, `/admin/report`.
- Projects: `/admin/projects` CRUD + archive; notifications + templates:
  `/admin/notifications`, `/admin/notification-templates`; settings:
  tenant settings routes (store name, currency, timezone, tax rate,
  notification preferences); audit logs: `GET /admin/audit-logs` (filter by
  user/entity/action) — surface an activity log page.

## API conventions

- All list endpoints are paginated `{ data: [...], metadata: { total, page,
  limit, totalPages, hasNextPage, hasPrevPage } }` and accept
  `?page=&limit=` (plus `filter`/`search` where documented).
- Response envelope `{ status, code?, message?, data? }`; error `code`
  values are stable — map them to copy.
- Rate limits: 300 req/min for OWNER/ADMIN on /admin (100 default);
  handle 429 with `Retry-After`.
- Every mutation is tenant-scoped server-side; the UI must never render
  cross-tenant data it somehow received — report it as a bug instead.

## Acceptance criteria

- A merchant can: configure an offering type, build a configurable product
  (groups/choices), schedule capacity slots, upload media, watch orders and
  deliveries, manage team and invites, run subscriber lists and campaigns,
  read analytics, and update settings — all without any backend changes.
- Role enforcement is visible: USER tokens get a clean 403 page; OWNER-only
  actions (delete, role changes) are gated in UI where the API allows
  both roles.
- All money and counts come from API responses; pagination is always
  wired (no unbounded lists).
- Invite links round-trip: create → accept via the public endpoint → new
  user appears in the team list with the invited role.
- Any contract mismatch is reported against `docs/contract/openapi.json`,
  not patched around.
```
