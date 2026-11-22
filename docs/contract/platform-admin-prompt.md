# Prompt — Platform Admin Dashboard Integration

Use this prompt to build the platform (super-admin) dashboard on top of the
Possible CMS API. Contract artifacts: `docs/contract/openapi.json`,
`docs/contract/postman_collection.json`.

```text
You are building the platform operator dashboard for the Possible CMS
multi-tenant commerce platform. The backend is complete and is the source
of truth; do not propose backend changes unless a contract gap is confirmed
against docs/contract/openapi.json.

## Runtime and configuration

- Backend base URL per environment (dev: http://localhost:7373).
- This dashboard is the platform's internal tool: keep it behind the
  operator's own network/SSO perimeter. It is NOT tenant-facing and never
  needs a tenant `x-api-key`.

## Authentication

- `POST /super-admin/login` — platform credentials only (no tenant API
  key). Response provides the platform JWT; access tokens are short-lived
  and refresh via `POST /super-admin/refresh-token` (rotation semantics:
  the old refresh token is invalidated on use; revoked tokens are rejected).
- Every `/super-admin/*` request: `Authorization: Bearer <platform JWT>`.
  The middleware rejects anything without the SUPER_ADMIN role (403) and
  invalid/expired tokens (401). No tenant headers are used on this surface.
- The seeded platform account is created by `npm run seed:superadmin`
  (credentials from env). Do not build a registration path — the platform
  account is provisioned, not self-registered.

## Tenants

- `GET /super-admin/tenants` (paginated), tenant detail with per-tenant
  lists: users, products, orders, payments, audit logs (tenant_id-scoped
  sub-endpoints).
- Tenant lifecycle: create/onboard, update, and STATUS control
  (ACTIVE, SUSPENDED, EXPIRED, DELETED, OUTDATED, ABANDONED).
  Status is enforced platform-wide: suspended/deleted/abandoned tenants
  fail every protected storefront request with a clear message, so surface
  status prominently and confirm destructive changes.
- Credentials: tenant API keys are shown only where the platform workflow
  legitimately needs them (e.g. after onboarding or impersonation) — copy
  to clipboard with an explicit "shown once" pattern, never rendered in
  lists or logs.

## Impersonation (support workflow)

- `POST /super-admin/tenants/{id}/impersonate` →
  `{ accessToken, refreshToken, apiKey, tenant: { id, name, domain } }` —
  an OWNER-role token for the target tenant plus its API key.
- Build a "Open storefront/dashboard as this tenant" action that hands the
  returned `apiKey` + token to the merchant dashboard in a controlled way
  (e.g. one-time handoff page → dashboard session). Banner any impersonated
  session (`impersonated: true` claim) and provide an exit action.
- Audit: impersonation is a privileged operation — reflect it in the UI and
  avoid logging the returned tokens.

## Platform analytics

- `GET /super-admin/overview` (or the overview/stats endpoint — see
  collection "Super Admin" folder): platform-wide counts and revenue
  (these aggregates are intentionally unscoped; they are platform stats).
- Tenant-level statistics and revenue reporting endpoints (see collection)
  for per-tenant drill-down: revenue, users, products, orders.
- Audit logs: `GET /super-admin/audit-logs` (paginated, filterable) — build
  a compliance view (tenant, actor, action, entity, IP, user agent).

## Users across tenants

- `GET /super-admin/users` (paginated, filterable) with tenant attribution;
  `PUT .../role` and delete actions exist — gate them behind explicit
  confirmation; deleting a user cascades their sessions (refresh tokens).

## Conventions and safety

- Response envelope `{ status, code?, message?, data? }`; paginated lists
  use `{ data, metadata: { total, page, limit, totalPages, hasNextPage,
  hasPrevPage } }` and accept `?page=&limit=&filter=`.
- Never log, persist, or display platform or tenant secrets (API keys,
  tokens). Mask by default.
- Destructive platform actions (tenant suspension, user deletion) must be
  two-step confirmed with the consequence stated (e.g. "All storefront
  requests for this tenant will fail").
- Handle 401 (re-login), 403 (non-super-admin token), and 429 rate limits
  (100 req/min default) with `Retry-After`.

## Acceptance criteria

- An operator can: log in with platform credentials, browse and manage all
  tenants (status lifecycle included), impersonate a tenant into the
  merchant dashboard and exit cleanly, read platform and per-tenant
  analytics, and review audit logs — with no tenant API key ever required.
- Impersonation flow: token + apiKey are consumed in-session, shown once,
  never persisted to local storage beyond the session, and the UI marks the
  session as impersonated.
- No secret appears in console logs, network traces annotated by the app,
  or error reports.
- Any contract mismatch is reported against `docs/contract/openapi.json`,
  not patched around.
```
