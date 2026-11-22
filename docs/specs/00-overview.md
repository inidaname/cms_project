# Multi-Tenant Commerce CMS: Overview

## What this is

This repository is a multi-tenant ecommerce and email campaign backend for
independent storefronts. A tenant has its own users, catalog, carts, orders,
payments, subscribers, campaigns, settings, team, notifications and audit log.

The application is currently a modular monolith built in TypeScript. It exposes
a Fastify API for normal Node.js and serverless use and includes a Cloudflare
Worker entrypoint that mounts the same route modules through a compatibility
shim.

The project also includes a super-admin area for platform-wide tenant and
revenue administration.

## Runtime and tech stack

Primary application:

- Node.js and TypeScript
- Fastify 5
- Prisma 6 with PostgreSQL
- Neon/PostgreSQL through the Prisma Neon adapter
- AJV-backed route validation and generated Swagger/OpenAPI documentation
- JWT access and refresh authentication
- bcrypt/bcryptjs password hashing
- Redis/Aiven-compatible caching
- Resend and Nodemailer for email
- Cloudflare R2 for file uploads
- Cloudflare Workers and KV for the worker deployment

Supporting infrastructure:

- PostgreSQL migrations and schema in `prisma/migrations/` and `prisma/schema.prisma`
- R2 uploads through the `/upload` route
- Finecore payment-provider configuration and checkout integration
- Cloudflare Worker routes under `src/worker/`
- Swagger UI at `/docs` and Scalar API reference at `/documentation`

## Tenant model

Tenants are isolated through a `tenant_id` on tenant-owned records. Tenant
identity is resolved from the `x-api-key` request header for normal tenant
routes. Public onboarding and a small set of platform/public routes are exempt.

The `Tenant` model stores the tenant name, domain, API key, logo, status and
related configuration. Tenant status is enforced before protected tenant
operations.

The role model is:

- `SUPER_ADMIN`: platform administration
- `OWNER`: tenant owner and administrative operations
- `ADMIN`: tenant administration
- `USER`: tenant end user

Admin routes require both a valid tenant API key and an owner/admin bearer
token. Super-admin routes use platform authentication and do not resolve a
tenant.

## Core modules

### Authentication and users

- Tenant onboarding and registration
- User registration and login
- Access and refresh tokens
- Password reset tokens
- Current-user lookup and update
- Tenant-scoped user listing

### Catalog

- Products with status, quantity, pricing and attributes
- Product variations and selectable variation values
- Parent/child bundle components
- Discounts
- Tenant-scoped product operations

### Carts and checkout

- Tenant and user carts
- Cart items, quantities, variation selections and bundle selections
- Cart totals
- Checkout creation and lookup
- Cart-to-sale conversion

### Orders, delivery and payments

- Sales/order records tied to a cart and customer
- Order status and delivery information
- Finecore payment configuration
- Payment initiation, status and refund operations
- Delivery type, recipient details, tracking and estimated arrival

### Email and subscribers

- Subscribers and unsubscribe status
- Subscriber lists and list membership
- Email campaigns with draft, scheduled, sending, sent and failure states
- Individual send records and send status
- Bulk subscriber import
- Resend and Nodemailer email support

### Projects

- Tenant-scoped project records
- Active, archived and deleted project states
- Project descriptions and JSON settings

### Admin and analytics

- Dashboard and revenue, user and product analytics
- Full reporting
- Team invitations and role changes
- Audit logs and entity/user history
- Tenant settings
- Notifications and notification templates
- Push tokens and per-user notification preferences

### Super admin

- Platform login and token refresh
- Tenant management and tenant status
- Platform analytics and tenant statistics
- Revenue reporting

## Repository layout

```text
src/
  app.ts                 Fastify application assembly
  core/
    auth/                Authentication and password flows
    tenants/             Tenant onboarding and management
    users/               User operations
    product/             Catalog and variations
    carts/               Cart operations
    sales/               Checkout and sales
    delivery/            Delivery operations
    payments/            Payment-provider integration
    subscribers/         Subscribers and imports
    finecore/            Finecore configuration and client
    webhook/             Provider webhook handling
    admin/               Admin, analytics, teams and notifications
    super-admin/         Platform-level administration
  plugins/               Fastify plugins and shared decorators
  routes/                Fastify route modules
  worker/
    index.ts             Cloudflare Worker entrypoint
    lib/                 Worker compatibility/application context
    middleware/          Tenant and rate-limit middleware
    routes/              Route-to-worker adapter
  middleware/            Additional tenant loading
  helpers/               Shared utilities
  utils/                 Schemas, Swagger and response helpers
prisma/
  schema.prisma          Database schema
  migrations/            Prisma migrations
  seed.ts                Local seed data
  seed-superadmin.ts     Super-admin seed script
test/
  routes/                HTTP route tests
  plugins/               Plugin tests
docs/
  specs/                 Project specifications
api/
  index.ts               Serverless Fastify adapter
server.ts                 Node.js Fastify entrypoint
wrangler.jsonc            Cloudflare Worker configuration
```

## API organization

Fastify route modules are mounted under these prefixes:

- `/auth`
- `/tenants`
- `/users`
- `/product`
- `/carts`
- `/checkout`
- `/payments`
- `/webhook`
- `/admin`
- `/super-admin`

Other top-level routes include `/`, `/health`, `/ping` and file upload operations.
The Cloudflare Worker exposes `/upload` directly and maps the same route modules
through the worker route adapter.

Schemas should be kept alongside route modules. Swagger/OpenAPI output is
generated by Fastify; route and type definitions must remain in sync with the
Prisma models.

## Data protection and isolation

- Every tenant-owned Prisma record must carry and enforce `tenant_id`.
- Tenant data must be filtered on reads and writes, including nested relations.
- API keys identify tenants and bearer tokens must belong to the resolved tenant.
- Passwords and reset tokens must not be stored or returned in plain text.
- Personal and payment fields must be excluded from application logs.
- Sensitive tenant provider credentials must be stored as configuration, not
  committed to source control.
- Audit logs should record tenant, actor, action, entity and request metadata
  where available.

## Uploads

`POST /upload` accepts one multipart file in the `file` field and limits uploads
to 10 MiB. Files are stored in the configured Cloudflare R2 bucket under an
`uploads/` key. The response contains the object key, content type, size and a
public CDN URL when `R2_PUBLIC_BASE_URL` is configured.

Upload routes must validate the multipart boundary, file count and file size.
Storage credentials and public URLs must use environment or Worker variables.

## Reliability and security

- Validate route input with JSON schemas/AJV at the HTTP boundary.
- Apply tenant and role checks before service and database operations.
- Use refresh-token revocation and short-lived access tokens.
- Enforce tenant status and API-key validity.
- Apply rate limiting to Worker requests.
- Keep services behind thin route handlers and centralize reusable behavior in
  plugins and helpers.
- Paginate list endpoints and use database indexes for frequent tenant lookups.
- Use provider abstractions for payment and email integrations where additional
  providers are added.
- Add integration tests for tenant isolation, authentication, checkout and
  upload behavior.

## Development and scripts

```sh
npm install
npm run dev
npm test
npm run build:ts
npm run migrate
npm run seed:superadmin
npm run deploy
```

`npm run dev` runs the Fastify application locally. `npm run dev:worker` starts
the Cloudflare Worker entrypoint. Prisma migrations must be applied before
database-backed routes are exercised.

## Deliverables

The project is expected to keep these assets synchronized:

1. Prisma schema and migrations
2. TypeScript route handlers and service modules
3. Fastify JSON/AJV schemas and Swagger/OpenAPI output
4. Cloudflare Worker route compatibility
5. Tenant and super-admin seed data
6. Tests for authentication, tenancy, catalog, checkout and uploads
7. Environment variable documentation and deployment configuration
