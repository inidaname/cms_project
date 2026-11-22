# Improvement, Security, and Flexibility Prompts

This file contains implementation-ready prompts for the next Copilot tasks.
Use [00-overview.md](./00-overview.md) as the project context and keep changes
consistent with the existing modular-monolith architecture.

Before implementation, inspect the relevant Prisma models, route schemas,
handlers, services, Fastify plugins, Worker middleware, and tests. Do not
change behavior outside the task's scope.

## 1. Improve tenant isolation as a cross-cutting security primitive

```text
Audit tenant isolation across the Fastify application and Cloudflare Worker.
For every tenant-owned Prisma model and service operation, verify that reads,
writes, nested relations, aggregates, webhooks, uploads, and super-admin
impersonation actions are constrained by tenant_id.

Do not make speculative schema changes. Start with the existing x-api-key
tenant resolver, bearer-token tenant checks, and role checks in:
- src/plugins/check-tenant.ts
- src/worker/middleware/check-tenant.ts
- src/core/**
- prisma/schema.prisma

Add or extract a small shared pattern for tenant-scoped queries where practical.
Fix confirmed cross-tenant access paths and add focused integration tests that
prove one tenant cannot read or mutate another tenant's users, products, carts,
sales, payments, projects, campaigns, team, notifications, or settings.

Acceptance criteria:
- Every protected tenant route resolves and validates the API key and tenant status.
- Bearer tokens are checked against both tenant_id and required role.
- Public and webhook routes have an explicit, documented exemption.
- No tenant-owned query intentionally omits tenant_id.
- Tests use two tenants and cover reads and writes.
- No unrelated refactoring or API response changes.
```

## 2. Harden authentication and credential handling

```text
Review authentication, refresh tokens, password reset, team invitations,
super-admin login, provider secrets, and JWT configuration.

Expected areas include:
- src/plugins/jwt-plugin.ts
- src/core/auth/**
- src/core/super-admin/**
- src/core/admin/team-service.ts
- src/core/finecore/**
- prisma/schema.prisma

Remove unsafe fallback secrets and make JWT configuration fail fast in
production when required environment variables are missing. Preserve the
current access/refresh-token behavior unless a security issue requires change.
Verify that password and reset/invite tokens are hashed, single-use where
appropriate, scoped, and consistently expired. Review login and registration
responses so password hashes or refresh-token internals are not exposed.

Also review provider credential storage and webhook signature verification.
Do not print secrets or credentials. Add focused tests for invalid JWTs,
wrong tenants, expired refresh/reset tokens, replayed team invites, and
missing configuration.

Acceptance criteria:
- No production fallback JWT secret.
- No password, reset token, refresh token, API key, or provider secret is returned.
- Authentication failures use consistent unauthorized/forbidden responses.
- Security-sensitive configuration is documented in an environment example.
- Tests cover success, invalid, expired, reused, and cross-tenant cases.
```

## 3. Improve checkout, payment, and webhook correctness

```text
Audit the cart-to-sale-to-payment flow and Finecore integration for consistency,
idempotency, tenant isolation, and Worker/Node parity.

Relevant code includes:
- src/core/carts/**
- src/core/sales/**
- src/core/payments/**
- src/core/finecore/**
- src/core/webhook/**
- src/routes/checkout/**
- src/routes/payments/**
- src/routes/webhook/**
- src/worker/**

Identify race and replay risks around checkout creation, payment status,
webhooks, cart checkout, and sales status. Verify that monetary values use a
safe representation and that state transitions are explicit. Webhook verification
must select the correct tenant secret and reject missing, malformed, stale,
replayed, or mismatched signatures.

Do not replace the provider in this task. Introduce only the abstractions and
state checks needed for predictable behavior and testability.

Acceptance criteria:
- A repeated or reordered webhook cannot create duplicate or unsafe state changes.
- Checkout and payment records remain tied to the same tenant and cart.
- Reconciliation has an explicit terminal-state policy.
- Currency and amount calculations are not silently rounded or converted.
- Node and Worker implementations produce equivalent behavior.
- Focused tests cover success, replay, failure, unknown payment, and signature errors.
```

## 4. Bring upload handling to parity and add media safety

```text
Compare the Fastify upload behavior, src/routes/upload/routes.ts, and the
Cloudflare Worker /upload route. Consolidate or align them into a consistent
multipart contract.

The route must:
- require exactly one file in the file field;
- enforce the 10 MiB limit at both metadata and streamed-data boundaries;
- validate multipart/form-data and reject extra files;
- reject unsafe or unexpected content types while allowing normal storefront assets;
- generate opaque object keys and never trust a client filename;
- preserve tenant or actor context when media metadata is stored;
- return consistent error and success shapes.

Also inspect storage configuration, public URL generation, deletion behavior,
and whether signed/private URLs are needed for sensitive uploads. Do not add
image transformation unless the project already requires it.

Acceptance criteria:
- Node and Worker accept and reject the same cases.
- Oversized and malformed uploads fail before unsafe object writes.
- No filename path traversal or content sniffing gap remains.
- R2 configuration failures return a documented 503 response.
- Tests cover missing file, extra fields/files, size limits, malformed content,
  allowed types, disallowed types, and public URL generation.
```

## 5. Increase route test coverage and create tenant-aware fixtures

```text
Increase automated test coverage without rewriting the Fastify or Worker
architecture.

Start by mapping every route in:
- src/routes/**
- src/core/*/*.schema.ts

Create reusable test fixtures for at least two tenants, owner/admin/user roles,
active/suspended tenants, and valid/invalid API keys and JWTs. Keep database
setup deterministic and isolated. Use the existing Node test and fastify-cli
helper patterns, and add only dependencies already used or justified for
integration testing.

Prioritize:
1. Tenant isolation
2. Authentication and role enforcement
3. Product/cart/checkout/sale transitions
4. Payment and webhook verification
5. Multipart uploads
6. Team invites and super-admin impersonation
7. Subscriber/campaign behavior

Acceptance criteria:
- Tests fail if a protected route lacks or mismatches tenant context.
- Tests cover positive and negative authorization cases.
- Tests clean database state and are safe to rerun.
- npm test passes.
- New tests are named by behavior, not implementation detail.
```

## 6. Add provider and cache flexibility behind existing interfaces

```text
Improve flexibility for the existing payment, email, cache, and storage
integrations without creating broad framework churn.

Define the smallest provider-facing interfaces needed by current services,
using existing implementations as the baseline:
- Finecore for payments
- Resend and Nodemailer for email
- Redis/Node cache and Cloudflare KV/Worker cache
- R2 for uploads

Centralize environment validation and provider configuration selection. Replace
direct provider assumptions in handlers/services only where it improves
testability or deployment parity.

Preserve the public HTTP contracts and existing default behavior. For example,
email delivery should remain best-effort where documented; provider failures
must not silently succeed or leak provider credentials.

Acceptance criteria:
- The application can select provider implementations by configuration.
- Missing provider configuration has explicit startup or request behavior.
- Services can be unit-tested with in-memory or fake providers.
- Node and Worker provider adapters follow the same contract.
- Environment variables are documented and no credentials are committed.
- Existing route schemas and externally visible responses remain compatible.
```

## 7. Improve API contracts and OpenAPI consistency

```text
Audit route definitions and AJV/Fastify response schemas against actual
handler and service behavior. The source of truth should remain the existing
TypeScript route modules and src/core/*/*.schema.ts files.

Prioritize:
- consistent success/error status shapes;
- documented tenant and authorization requirements;
- pagination and filtering for list endpoints;
- UUID and enum formats;
- sensitive fields omitted from responses;
- request and response limits;
- Swagger and Scalar parity;
- Node and Worker route exposure parity.

Do not break existing clients casually. If a response shape is inconsistent,
first document the cases and then normalize only the intended scope.

Acceptance criteria:
- Swagger generation succeeds.
- All public handlers with JSON responses have matching response schemas.
- Sensitive fields such as passwords, refresh tokens, API keys, and provider
  secrets do not appear in reusable response schemas.
- Pagination contracts are consistent.
- Route additions or removals are reflected in both Worker and Fastify maps.
- Tests validate at least representative success and error response shapes.
```

## 8. Establish an implementation sequence

```text
Create a safe implementation plan that combines prompts 1-7.

First fix security and tenant-isolation bugs that could expose or mutate data.
Second add the test harness needed to prevent regressions. Third repair
checkout/webhook/upload and provider behavior. Fourth normalize API contracts.
Finally improve flexibility and deployment parity.

For each work item, provide:
- affected files;
- existing behavior;
- intended behavior;
- migration or compatibility requirements;
- focused test command;
- full validation command;
- rollback or feature-flag strategy.

Do not implement every area in one change. Use small, reviewable pull requests
and stop after each acceptance criterion is verified.
```

## 9. Introduce a flexible product and offering domain

```text
Design and implement a flexible product/offering model that supports
multiple tenant business types without hard-coding gift shops, restaurants,
catering companies, schools, or tutoring providers into separate application
models.

Start by auditing:
- prisma/schema.prisma, especially Product, ProductComponent,
  ProductVariation, CartItems, and Sales
- src/core/product/**
- src/core/carts/**
- src/core/sales/**
- src/core/checkout/**
- src/core/delivery/**
- src/core/users/**
- tenant and role schemas
- the existing route and OpenAPI schemas

The following are examples and validation scenarios, not a fixed list of
supported industries or product types. Do not introduce gift, catering,
restaurant, school, course, event, or organization-specific models or branches
unless a generic requirement cannot be met otherwise. The final design should
allow future tenant types and customer workflows to be configured without
requiring new application-specific domain models or route handlers.

Use these examples to verify flexibility:

1. A gift shop selling a single gift.
2. A gift shop selling a configurable gift box in which a customer chooses
   component gifts from allowed lists and may meet minimum/maximum item rules.
3. A catering tenant selling a standalone meal.
4. A catering tenant selling a meal package composed of selections from meal
   groups, such as an entree and two sides.
5. An outdoor catering service that is a booking offering for an event and lets
   the customer select multiple meals, quantities, service dates, location,
   delivery/setup requirements, and expected guest count.
6. A school or tutoring tenant selling a course or tutoring service to an
   individual or organization.
7. A course or service purchased by an organization that includes multiple
   staff or learner participants, assignment records, and organization-level
   billing or contact information.

Create tenant-configurable concepts rather than tenant-specific code paths.
At minimum, consider:
- offering type or category;
- tenant-defined offering types and categories;
- reusable assembly/composition primitives;
- reusable scheduling and capacity primitives;
- reusable buyer/organization and participant primitives;
- configurable option groups and choices;
- fixed components and optional components;
- minimum and maximum quantities or selections;
- nested/composite offerings;
- variation dimensions;
- availability windows and capacity;
- event or booking fields;
- organization, participant, and staff/learner relationships;
- service location and delivery details;
- pricing rules for base prices, selections, quantity, group size, and components;
- inventory or capacity limits that may apply to components, parent offerings,
  or scheduled instances.

These primitives should be configured through tenant data or a general
configuration schema, not hard-coded enum values or named service branches.
Do not require any future scenario to be represented by adding a gift,
catering, course, or other industry-specific condition in application code.

Preserve existing gift bundle fields only through a compatibility migration
if practical. Do not remove isBundle, bundleComponents, min_items, max_items,
or ProductVariation until existing clients are checked. Existing create-product
and add-bundle-component routes must remain usable or have a documented,
compatible migration path.

Use explicit domain types and validation instead of an uncontrolled JSON blob.
JSON settings may remain tenant-configurable extensions, but core selection,
pricing, inventory, booking, and participant constraints must be structured
and inspectable.

Cart selections must retain a snapshot of the selected configuration and
component choices. Orders and sales must preserve the configuration at purchase
time even if the offering or price later changes. Booking/service details must
not be lost between cart, checkout, payment, delivery, and fulfillment.

Define tenant isolation for all new offering, configuration, booking,
organization, participant, and staff records. Super-admin operations must not
bypass tenant scope.

Do not implement an end-to-end rewrite, feature-specific checkout, or
hard-coded UI concepts. Propose the smallest schema, API, and service changes
that support these scenarios and keep the modular monolith and Fastify/Worker
route adapters in sync.

Acceptance criteria:
- One data model can represent a physical product, configurable bundle,
  meal package, catering event, course, and organization purchase.
- Existing standalone products and gift bundles continue to work.
- The API can express allowed choices, required choices, quantity limits,
  nested components, and pricing adjustments.
- A customer can configure a gift box or meal package and calculate a total
  deterministically.
- An event booking can capture meals, quantities, date/time, location, guest
  count, and service requirements.
- A course purchase can be assigned to an individual or organization and
  include a participant or staff list.
- Cart and order records snapshot configuration and pricing.
- The Prisma schema, AJV/Fastify schemas, route handlers, and Worker routes
  remain aligned.
- Migration strategy preserves existing product and cart data.
- Focused tests cover standalone, fixed bundle, configurable bundle, meal
  package, catering event, individual course, organization course, invalid
  selections, quantity limits, tenant isolation, and historical price snapshots.
```
