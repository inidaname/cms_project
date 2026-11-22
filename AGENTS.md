# Project guide

Multi-tenant commerce and campaign CMS for tenant-owned storefronts, catalogs,
carts, sales, payments, email, projects, team management, notifications, and
platform administration.

Project requirements live in `docs/specs/`. Read the relevant specification
before starting a phase. Update specifications alongside significant design
changes. There is currently no `docs/plan.md`.

## Stack

- Node.js and TypeScript
- Fastify 5 API with AJV schemas and generated Swagger/OpenAPI documentation
- Prisma 6 with PostgreSQL/Neon
- JWT access and refresh authentication
- Redis/Aiven-compatible caching
- Cloudflare Workers, KV, R2, and a Worker compatibility shim
- Resend and Nodemailer for email
- Finecore for payments
- Node test runner with `tsx`/`ts-node`

## Layout

- API entry: `src/app.ts`
- Fastify route modules: `src/routes/`
- Domain modules and handlers/services: `src/core/`
- Fastify plugins and decorators: `src/plugins/`
- Shared schemas and utilities: `src/utils/`
- Worker entry and compatibility layer: `src/worker/`
- Serverless Node adapter: `api/index.ts`
- Node entry: `server.ts`
- Database schema and seed scripts: `prisma/`
- HTTP/plugin tests: `test/`

Follow the existing pattern: thin route handlers, domain services, JSON/AJV
schemas, Fastify plugins/decorators, and tenant-aware Prisma queries.

## Database and Prisma rules (strict)

- NEVER run `prisma migrate dev`, `prisma migrate deploy`, `prisma migrate reset`, `prisma migrate diff` or `prisma db push`.
- NEVER generate, create, edit or delete files in the migrations folder.
- You may edit `schema.prisma` only. After schema changes, stop and tell me exactly what changed and which command I should run myself.
- `prisma generate` and `prisma validate` are allowed.
- Never omit `tenant_id` from operations that belong to a tenant-owned model.
- Preserve existing data and provide a compatibility/migration plan for schema
  changes; do not create or apply migrations yourself.

## Git rules

- Never commit secrets or `.env` files.
- Do not read or print `.env` values.
- Inspect git state only when needed to protect unrelated work. Do not revert
  or overwrite changes you did not make.
- Commit only when explicitly requested, after tests pass, with a clear message.

## Working rules

- Work in small phases and finish one before starting the next. Do not start work outside the current phase.
- Inspect the relevant route, schema, service, plugin, Worker adapter, and tests
  before changing behavior.
- Preserve Node/Fastify and Cloudflare Worker parity for shared routes.
- Keep tenant and role enforcement at the API layer; UI-side checks are not
  sufficient.
- Validate route input with existing AJV/Fastify JSON schemas. Keep Swagger and
  response schemas synchronized.
- Keep provider integrations behind existing abstractions or add the smallest
  provider-facing interface needed for testability.
- Do not log passwords, tokens, API keys, provider secrets, payment data, or
  personal customer data.
- Before finishing a phase: run the smallest relevant tests first, then
  `npm run build:ts`, the Worker typecheck when Worker code changed, and
  `npm test` when feasible.
- Update directly related documentation/specifications.
- Do not make speculative product-domain or industry-specific abstractions.
  Prefer reusable composition, configuration, scheduling, participant, and
  pricing primitives.
- Do not install new dependencies without telling me why.

## Available scripts

- `npm run dev` - Fastify development server
- `npm run dev:worker` - Cloudflare Worker development server
- `npm test` - build, test TypeScript compilation, and Node tests
- `npm run build:ts` - generate Prisma client and compile TypeScript
- `npm run typecheck:worker` - compile-check the Worker
- `npm run migrate` - create/apply a local Prisma migration interactively
- `npm run seed:superadmin` - seed or update the platform super admin
- `npm run deploy` - deploy the Cloudflare Worker
