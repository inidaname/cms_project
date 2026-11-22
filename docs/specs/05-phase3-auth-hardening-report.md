# Phase 3 Report — Auth and Credential Hardening (prompt 2)

Status: **implemented and validated 2026-11-19**.

## Audit findings and fixes

| # | Finding | Fix |
|---|---------|-----|
| 1 | JWT secret fell back to the literal `"JWT_SECRET"` in both runtimes | `src/plugins/jwt-plugin.ts`: **fail fast in production** (`NODE_ENV=production`) with a clear startup error; dev fallback only with a loud warning. `src/worker/lib/app-context.ts`: Worker **fails on first request** without `JWT_SECRET` (error message points to `wrangler secret put` / `.dev.vars`) |
| 2 | Refresh tokens stored plaintext in `RefreshToken.token` (auth + super-admin paths) | Tokens are now stored **sha256-hashed** at rest. Legacy plaintext rows keep working through a fallback lookup and are rotated to hashed rows on next refresh (documented compatibility window) |
| 3 | Refresh-token "rotation" could mint the **identical token** (no unique claim) — same-second login hit the `RefreshToken.token` unique constraint with a P2002 500, and refresh could return the token it just received | All refresh tokens (user login/register/refresh, super-admin login/refresh/impersonate) now carry a **`jti` claim** (`randomHex(16)`), making every issuance unique. Verified: two JWTs signed seconds apart differ |
| 4 | Refresh flow ignored the `revoked` flag | Both user and super-admin refresh paths reject revoked tokens (401) |
| 5 | Logout deleted **any** refresh token (cross-user logout DoS) | `POST /auth/logout` now verifies the refresh token's JWT `id` matches the authenticated user; foreign tokens are rejected 403 and left intact |
| 6 | `GET /users/tenant/` had **no response schema** and returned full Prisma rows — **password hashes leaked** to admin clients | New `src/utils/sanitize.ts` (`sanitizeUser`); `getAllUsers` strips `password` at the service level; defense-in-depth sanitization applied to `/users`, `PUT /users`, login/register responses (their schemas already whitelisted fields) |
| 7 | Team invite tokens stored plaintext, and the raw token was **never delivered** (response was schema-stripped, no email in the path) — invites were effectively un-acceptable except via DB access | `inviteMember` stores only the token **hash** and returns the raw token in the response; the response schema now documents `token` (plus `role`), fixing both hashing and the delivery channel. `acceptInvite` accepts hashed lookups with the legacy plaintext fallback |
| 8 | Provider secrets in responses | Verified clean: Finecore config responses expose only `hasApiKey` / `hasWebhookSecret` booleans; no provider secret reaches a response schema |

Already-verified-clean (no change needed): password reset tokens (sha256
hashed, single-use `used` flag, 15-minute expiry, tenant-scoped,
previous-token deletion), bcrypt password hashing (rounds 10), invite
single-use (`accepted`) and 7-day expiry.

## Configuration documentation

- `.env.example` added: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`,
  `REDIS_URL`, `MASTER_APIKEY`, `FINECORE_BASE_URL`, `FRONTEND_URL`,
  `RESEND_API_KEY`, `R2_PUBLIC_BASE_URL`, plus Worker binding notes. No real
  values; `.env` remains ignored.

## Tests — `test/routes/auth-security.test.ts` (12 behavior-named cases)

- Registration/login/tenant-user-listing never expose password hashes
- Wrong credentials rejected identically for unknown users (no enumeration)
- Refresh rotation works, the rotated-away token is dead (replay → 401)
- Refresh tokens are hashed at rest (raw JWT never persisted)
- **Legacy plaintext refresh token** still refreshes and rotates to a hash
- A revoked refresh token is rejected
- Logout rejects foreign refresh tokens (403), revokes own (and the revoked
  token is then dead)
- Password reset tokens are single-use and expiring (replay → 400,
  expired → 400)
- Missing `JWT_SECRET` fails fast in production; dev fallback still boots
  outside production (env save/restore around the probes)

## Incidental fixes found while testing

- `src/plugins/cache.ts`: the Redis connect used a nonexistent ioredis
  option (`retryDelayOnFailover`), so a closed Redis could intermittently
  hang startup until Fastify's plugin timeout. Connect is now bounded (3s),
  caching degrades gracefully, and `onClose` no longer emits unhandled
  "Connection is closed" rejections after a forced disconnect.

## Validation results

- `npm run build:ts` — pass
- `npm run typecheck:worker` — pass
- Full suite (`node --test --test-concurrency=1` over `test/**` against the
  throwaway local Postgres): **73/73 pass, exit 0**

## Compatibility notes

- Pre-existing refresh-token/invite rows keep working via the plaintext
  fallback lookup and are converted to hashes on their next use/rotation.
  The fallback is the documented deprecation window; hashing is enforced for
  all newly issued tokens.
- Behavioral tightenings: cross-user logout now 403s; revoked tokens now
  401 on refresh; Workers without `JWT_SECRET` now fail on first request;
  Node in production refuses to start without `JWT_SECRET`.
