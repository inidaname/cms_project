# Phase 6 Report — API Contracts and OpenAPI Consistency (prompt 7)

Status: **implemented and validated 2026-11-19**.

## The core inconsistency (found in Phase 2, fixed here)

Several `/admin/*` list endpoints declared **paginated response contracts**
(`{ data: [...], metadata }`) in their AJV schemas while the handlers sent
bare arrays or ad-hoc shapes — the serializer then emitted `{}` (empty
objects), silently hiding real data from clients:

| Endpoint | Declared schema | Old handler output | Fix |
|---|---|---|---|
| `GET /admin/subscribers` | `{ data, metadata }` | `{ data, count }` | Paginated `{ data, metadata }` (count dropped — documented normalization) |
| `GET /admin/lists` | bare array | bare array | Paginated `{ data, metadata }` + schema updated (documented normalization; lists can grow) |
| `GET /admin/campaigns` | `{ data, metadata }` | bare array → serialized `{}` | Paginated `{ data, metadata }` |
| `GET /admin/orders` | `{ data, metadata }` | bare array → `{}` | Paginated `{ data, metadata }` |
| `GET /admin/payments` | `{ data, metadata }` | bare array → `{}` | Paginated `{ data, metadata }` |
| `POST /admin/lists/add-subscribers` | `data: object` | `{ added }` → `{}` | Schema now declares `added: integer` |
| `POST /admin/lists/remove-subscribers` | `data: object` | `{ removed }` → `{}` | Schema now declares `removed: integer` |
| `POST /admin/campaigns/send` | `data: object` | `{ scheduled }` → `{}` | Schema now declares `scheduled: integer` |

All list endpoints now use the shared `createPagination` shape
(`total, page, limit, totalPages, hasNextPage, hasPrevPage`) and accept
`?page=&limit=`. `discounts` was already consistent (bare array, no
declared pagination) and was left alone.

## Other contract fixes

- `GET /checkout/:checkout_id` had **no response schema**; one was added
  (`data` typed as `sales#`, nullable via `oneOf` with `type: "null"` —
  fast-json-stringify ignores `nullable` next to a `$ref`, which turned
  `data: null` into `{}` during testing; the `oneOf` form serializes both
  the sale and the scoped-miss `null` correctly).
- Shared model definitions extended to carry the aggregates handlers send:
  `_count` added to `list#`, `campaign#`, `subscriber#` (otherwise silently
  stripped).
- Sensitive-field sweep: reusable response schemas contain no passwords,
  refresh tokens, API keys or provider secrets (`user#`/`tenant#` audited;
  Finecore config routes expose only `hasApiKey`/`hasWebhookSecret`
  booleans). The `tenant#` schema still includes `apiKey` — it is only
  reachable by the tenant itself (via its own key) or super-admin.

## Node/Worker route-map parity

- Worker gained `GET /` and `GET /ping` (tenant-scoped, registered after
  `checkTenant` like Node).
- Worker `GET /health` payload aligned with Node:
  `{ status: "ok", timestamp }` (was `{ ok, ts }`).
- Worker-only `GET /health/db` kept (documented extra).

## Tests

- Phase 2 tests updated: they previously had to assert DB state because
  responses were stripped — they now assert the real response contract
  (`added`, `scheduled`, paginated campaign lists, per-tenant arrays).
- Full suite: **93/93 pass, exit 0**.
- Swagger generation verified: `/docs/json` returns 200 with 104 paths,
  including the checkout response schema and the `scheduled` property.

## Documented but unchanged

- Success/error status shapes already follow `{ status, code?, message?,
  data }`; a few routes omit `code` — normalizing those would touch every
  client, so they remain as-is and are visible in Swagger.
- Request limits (body size) are enforced globally by Fastify defaults;
  per-route limits (uploads) documented in the Phase 5 report.
