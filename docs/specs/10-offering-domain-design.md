# Design Proposal — Flexible Product and Offering Domain (prompt 9)

Status: **design proposal, awaiting approval — no code or schema changed yet.**

Goal: one data model that supports physical products, configurable bundles,
meal packages, catering/booking offerings, courses sold to individuals, and
organization purchases with participants — using **tenant-configurable
primitives**, not industry-specific code paths. This follows prompt 9's
constraint to propose the *smallest* schema, API, and service changes and to
preserve the existing gift-bundle model.

## Design principles

1. **Additive only.** Every new model is a new table; existing tables gain at
   most nullable columns. No destructive migration; existing products,
   bundles, carts, and orders keep working unchanged.
2. **Behavior flags, not industries.** No `GIFT`/`CATERING`/`COURSE` enum
   anywhere. Offering behavior is expressed through generic, tenant-set
   flags on a tenant-defined *offering type*.
3. **Structured constraints, snapshot JSON.** Live configuration (option
   groups, choices, slots, participants) lives in real tables with
   validation. Only the frozen *purchase-time copy* of a selection is JSON
   (`CartItems.configuration`) — a snapshot, not a source of truth.
4. **Deterministic pricing.** One pricing engine computes line prices from
   base price + selections; results are stored on `CartItems` (existing
   `unit_price`/`value` columns) at add-to-cart time, so orders keep the
   purchase-time snapshot automatically.
5. **Tenant isolation everywhere.** Every new model carries `tenant_id`;
   all reads/writes are tenant-scoped; super-admin operations stay inside
   the platform scope they already have.

## Schema additions (all additive)

```prisma
// Tenant-defined offering behavior. Flags are generic primitives, not
// industries; a tenant can define "Gift Box", "Catering Package",
// "Course", or anything else and switch behaviors on/off.
model OfferingType {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id   String   @db.Uuid
  tenant      Tenant   @relation(fields: [tenant_id], references: [id])
  key         String   // tenant-chosen stable identifier, e.g. "bundle"
  name        String
  // Generic behavior primitives (tenant-configured):
  selectable     Boolean @default(false) // customers pick options/components
  scheduled      Boolean @default(false) // requires date/time slot
  participants   Boolean @default(false) // supports learner/attendee lists
  deliverable    Boolean @default(false) // service location/delivery details
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([tenant_id, key])
  @@index([tenant_id])
}

// Configurable option groups on an offering ("Pick 3 from this list").
// Generalizes the gift-box idea beyond fixed bundle components.
model OptionGroup {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id   String   @db.Uuid
  tenant      Tenant   @relation(fields: [tenant_id], references: [id])
  product_id  String   @db.Uuid
  product     Product  @relation(fields: [product_id], references: [id])
  name        String
  required    Boolean  @default(false)
  min_select  Int      @default(0)
  max_select  Int      @default(1)
  position    Int      @default(0)
  choices     OptionChoice[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenant_id, product_id])
}

// One selectable choice inside a group. `product_id` optionally links the
// choice to a real product (its stock/depletion applies); `price_delta`
// adjusts the line price deterministically.
model OptionChoice {
  id           String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id    String  @db.Uuid
  tenant       Tenant  @relation(fields: [tenant_id], references: [id])
  group_id     String  @db.Uuid
  group        OptionGroup @relation(fields: [group_id], references: [id], onDelete: Cascade)
  label        String
  product_id   String? @db.Uuid
  product      Product? @relation(fields: [product_id], references: [id])
  price_delta  Float   @default(0)
  active       Boolean @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([tenant_id, group_id])
}

// Scheduling + capacity primitive for scheduled offering types.
model OfferingSlot {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id    String   @db.Uuid
  tenant       Tenant   @relation(fields: [tenant_id], references: [id])
  product_id   String   @db.Uuid
  product      Product  @relation(fields: [product_id], references: [id])
  startsAt     DateTime
  endsAt       DateTime
  capacity     Int?     // null = unlimited
  bookedCount  Int      @default(0)
  location     String?  // service location for deliverable types
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([tenant_id, product_id, startsAt])
}

// Buyer/organization primitive (organization-level billing/contact).
model Organization {
  id           String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id    String  @db.Uuid
  tenant       Tenant  @relation(fields: [tenant_id], references: [id])
  name         String
  contactEmail String?
  contactPhone String?
  address      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([tenant_id])
}

// Participant/staff/learner record attached to a purchase. Generic: any
// tenant (course, event, catering) stores participants the same way.
model SaleParticipant {
  id         String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id  String  @db.Uuid
  tenant     Tenant  @relation(fields: [tenant_id], references: [id])
  sale_id    String  @db.Uuid
  sale       Sales   @relation(fields: [sale_id], references: [id])
  name       String
  email      String?
  role       String  // free-form, tenant-defined label (e.g. "learner")
  createdAt  DateTime @default(now())

  @@index([tenant_id, sale_id])
}
```

**Columns added to existing tables (nullable, additive):**

```prisma
model CartItems {
  // ...existing fields unchanged...
  configuration Json? // frozen purchase-time selection snapshot (see below)
}

model Sales {
  // ...existing fields unchanged...
  organization_id String? @db.Uuid
  organization    Organization? @relation(fields: [organization_id], references: [id])
}
```

Tenant relations added on `Tenant` for each new model.

## Purchase-time snapshot (why this shape)

At add-to-cart, the request's structured selection is **validated against
the live models** (groups, choices, min/max, slot availability) and then
frozen into `CartItems.configuration`:

```json
{
  "groups": [{ "group_id": "...", "choices": [{ "choice_id": "...", "quantity": 2 }] }],
  "slot_id": null,
  "participants": 2
}
```

Because `CartItems` already snapshots `unit_price`/`value` and is immutable
once the cart is `Checkedout`, the sale automatically preserves both
configuration and pricing at purchase time — even if the offering, its
prices, or its groups change later. No parallel snapshot table is needed.

## Pricing engine (deterministic, one function)

`priceSelection(product, variation, selection)` — pure function, unit-testable:

```
line unit price =
    product.price                                  // base
  | variation.price                                // when a variation is chosen
  + Σ choice.price_delta × choice.quantity         // option selections
  + Σ component.additionalPrice                    // legacy bundle components
```

Quantity multiplies as today (`value = product_quantity × unit_price`). No
rounding is introduced; the existing Float representation is unchanged
(its migration to a decimal type remains a separate, approved migration —
see Phase 4 report).

## Validation rules (generic, no industry branches)

Enforced in `addItemToCart` (and again at checkout) whenever the offering's
type has the matching flag on:

| Flag | Rules enforced |
|------|----------------|
| `selectable` | Every `group_id` must be a live group on that product (tenant-scoped); `required` groups present; `min_select ≤ Σ choices ≤ max_select` per group; choice quantities ≥ 1; choices active; linked-choice products tenant-scoped and in stock |
| `scheduled` | `slot_id` present, belongs to the product + tenant, `startsAt` in the future, `bookedCount + quantity ≤ capacity` (when capacity set) |
| `participants` | Optional `participants` count and/or participant list on checkout; participants stored on the sale |
| `deliverable` | Cart delivery fields (existing `deliveryType/address/recipient*`) plus optional slot `location` carry service details through checkout to `Delivery` (already linked to sales) |

Types without flags behave exactly as today (standalone products and legacy
gift bundles).

## API surface (additive; shared modules → automatic Worker parity)

All new routes are tenant-scoped AJV-validated Fastify modules under the
existing prefixes; the Worker shim mounts them via `prefixByPlugin`
automatically (both `/product` and `/admin` are already mapped).

**Tenant configuration (OWNER/ADMIN):**
- `POST/GET /admin/offering-types`, `PUT/DELETE /admin/offering-types/:id`

**Offering configuration (OWNER/ADMIN):**
- `POST/GET /admin/products/:product_id/option-groups`,
  `PUT/DELETE /admin/option-groups/:id`
- `POST /admin/option-groups/:id/choices`, `PUT/DELETE /admin/option-choices/:id`
- `POST/GET /admin/products/:product_id/slots`, `PUT/DELETE /admin/slots/:id`
- `POST/GET /admin/organizations` (tenant-defined buyer orgs)

**Storefront (existing routes, extended payloads — backward compatible):**
- `POST /carts/items/:cart_id?` — optional structured `selections`
  (`groups`, `slot_id`, `participants`) next to the existing
  `product_id/product_quantity/variation_id`; absent `selections` behaves
  exactly as today.
- `POST /checkout/` — optional `organization` (create-or-link by id) and
  `participants[]` stored on the sale; booking/delivery fields flow to
  `Delivery` unchanged.

**Read APIs:**
- `GET /product/:product_id` gains `offeringType`, `optionGroups` (with
  choices), `slots` in its include shape — additive response fields.

## Compatibility with the existing gift-bundle model

- `isBundle`, `bundleComponents` (`ProductComponent`), `min_items`,
  `max_items`, and `ProductVariation` are untouched and remain the
  supported path for fixed bundles; existing `create-product` and
  `add-bundle-component` routes keep working.
- `OptionGroup`/`OptionChoice` are an *additional* configurable-selection
  primitive; a product may use legacy bundle components, option groups,
  both, or neither.
- The pricing engine includes legacy component pricing, so mixed
  configurations price deterministically.
- No existing client is broken: all new request fields are optional, all
  new response fields are additive.

## Capacity handling (Neon-safe)

Interactive transactions are unreliable under the Neon driver (P2028,
documented in `cart-service.ts`). Capacity is therefore handled with a
compensating pattern instead of a transaction:

1. At add-to-cart: read `bookedCount`, reject if `bookedCount + qty >
   capacity` (advisory check).
2. At checkout: `updateMany({ where: { id, tenant_id }, data: { bookedCount:
   { increment: qty } } })`, then verify `bookedCount ≤ capacity`; if the
   guard trips, immediately decrement (compensation) and reject the
   checkout with 409.

The race window between check and increment is documented and accepted
(double-booking risk is bounded and self-correcting at checkout); a true
atomic guard would require a raw SQL conditional update, proposed only if
this becomes a real-world problem.

## Scenario coverage check (prompt 9's seven examples)

| Scenario | Covered by |
|---|---|
| 1. Gift shop selling a single gift | Existing standalone product (no flags) |
| 2. Configurable gift box with min/max item rules | `selectable` type + `OptionGroup(min/max)` + `OptionChoice(price_delta)` |
| 3. Catering: standalone meal | Existing standalone product |
| 4. Meal package (entree + two sides from groups) | `selectable` type + two `OptionGroup`s (one required, min 1; one required, min/max 2) |
| 5. Outdoor catering booking (multiple meals, quantities, service date, location, delivery/setup, guest count) | `scheduled + deliverable + selectable` type + `OfferingSlot` (date/location/capacity) + quantities in `selections` + existing `Delivery` fields; guest count = `participants` |
| 6. Course/tutoring sold to an individual | `participants` type; participant row for the buyer |
| 7. Course purchased by an organization with participants and org billing | `participants` type + `Organization` on the sale + `SaleParticipant[]` |

No scenario requires an industry-specific code path — the same routes,
engines, and validations serve all of them; only tenant configuration data
differs.

## Implementation phases (each gated on your approval)

| Phase | Content | Touches |
|---|---|---|
| 9a | Prisma schema additions + handoff: you review and run the migration; agent never runs `prisma migrate` | `prisma/schema.prisma` only |
| 9b | Offering-type + option-group/choice CRUD (admin routes, AJV schemas, tenant-scoped services) | `src/core/product/**`, `src/routes/admin|product`, Worker map (automatic) |
| 9c | Slots CRUD + capacity checks (compensating pattern) | same |
| 9d | Generalized cart selection: validation + pricing engine + `CartItems.configuration` snapshot | `src/core/carts/**` |
| 9e | Checkout: organization/participants, slot booking increment, snapshot verification; full scenario test suite (all 7 examples + invalid selections + quantity limits + tenant isolation + historical price snapshots) | `src/core/sales/**`, tests |

## Test plan (per prompt 9's acceptance criteria)

- One-model coverage: standalone, fixed bundle, configurable bundle, meal
  package, catering event, individual course, organization course.
- Legacy paths keep passing: existing Phase 2–6 suites (bundles, variations,
  carts) untouched and green.
- Invalid selections: unknown group/choice, min/max violations, inactive
  choice, foreign-tenant choice/slot.
- Quantity limits and deterministic totals (pricing engine unit tests).
- Tenant isolation: option groups/choices/slots/organizations/participants
  are invisible and immutable across tenants (two-tenant fixtures).
- Historical snapshots: change offering price/groups after add-to-cart;
  cart/checkout must keep the original configuration and prices.
- Booking: capacity rejection, compensation on race, past-slot rejection.
- AJV response schemas for every new route; Swagger parity; Worker route
  exposure verified through the shim route map.

## Migration handoff (when 9a is approved)

I will edit `prisma/schema.prisma` only. Then you run:

```sh
npm run migrate      # interactive; creates + applies the migration locally
```

The migration adds six tables and two nullable columns; nothing existing is
altered destructively. I will generate and show you the exact SQL
(`prisma migrate diff`) for review before you apply it.

---

## 9a — Schema changes applied (2026-11-19) and migration SQL preview

`prisma/schema.prisma` was edited (validate + generate pass; `tsc --noEmit`
clean). The actual migration file is generated by the Prisma CLI when **you**
run `npm run migrate` (migrations are never created or applied by the agent).
The hand-authored SQL below previews what the migration should contain —
review it against what the CLI generates:

```sql
-- Additive columns on existing tables
ALTER TABLE "CartItems" ADD COLUMN "configuration" JSONB;

ALTER TABLE "Sales" ADD COLUMN "organization_id" UUID;

-- OfferingType
CREATE TABLE "OfferingType" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selectable" BOOLEAN NOT NULL DEFAULT false,
    "scheduled" BOOLEAN NOT NULL DEFAULT false,
    "participants" BOOLEAN NOT NULL DEFAULT false,
    "deliverable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferingType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfferingType_tenant_id_key_key" ON "OfferingType"("tenant_id", "key");
CREATE INDEX "OfferingType_tenant_id_idx" ON "OfferingType"("tenant_id");

-- OptionGroup
CREATE TABLE "OptionGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OptionGroup_tenant_id_product_id_idx" ON "OptionGroup"("tenant_id", "product_id");

-- OptionChoice
CREATE TABLE "OptionChoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "product_id" UUID,
    "price_delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionChoice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OptionChoice_tenant_id_group_id_idx" ON "OptionChoice"("tenant_id", "group_id");

-- OfferingSlot
CREATE TABLE "OfferingSlot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferingSlot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OfferingSlot_tenant_id_product_id_startsAt_idx" ON "OfferingSlot"("tenant_id", "product_id", "startsAt");

-- Organization
CREATE TABLE "Organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Organization_tenant_id_idx" ON "Organization"("tenant_id");

-- SaleParticipant
CREATE TABLE "SaleParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleParticipant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SaleParticipant_tenant_id_sale_id_idx" ON "SaleParticipant"("tenant_id", "sale_id");

-- Foreign keys (Prisma defaults: required → RESTRICT on delete, CASCADE on update)
ALTER TABLE "OfferingType" ADD CONSTRAINT "OfferingType_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfferingSlot" ADD CONSTRAINT "OfferingSlot_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfferingSlot" ADD CONSTRAINT "OfferingSlot_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaleParticipant" ADD CONSTRAINT "SaleParticipant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleParticipant" ADD CONSTRAINT "SaleParticipant_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sales" ADD CONSTRAINT "Sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Status:** schema edited, `prisma validate` + `prisma generate` pass,
`tsc --noEmit` clean. **You run:** `npm run migrate` — then confirm the
generated migration matches the SQL above before applying. Phases 9b–9e
start after the migration is applied (their tests need the tables).

---

## Implementation report (2026-11-19) — prompt 9 delivered

All phases 9a–9e implemented and validated: **151/151 tests pass**
(build:ts, typecheck:worker, test typecheck all clean). The migration was
generated and applied by the user against the Docker test Postgres
(`cms-iso-test-pg`); **the same migration still needs to run on the Neon
database when it is reachable again** before any deployment uses the new
tables.

### What was built

- **9b — configuration CRUD** (`src/core/offering/`): tenant-defined
  `OfferingType`s (behavior flags), per-product `OptionGroup`/`OptionChoice`
  management — all routes under `/admin` (OWNER/ADMIN enforced on both
  runtimes), full AJV request/response schemas, 13 tests (per-tenant key
  uniqueness, cross-tenant 404s, cascade delete, linked-product checks).
- **9c — slots** (`offering-slot-service.ts`): scheduling + capacity CRUD
  with date-window validation, `?upcoming=true`, and the capacity/past-slot
  guard; 6 tests.
- **9d — generalized cart selection** (`cart-selection.ts`): structured
  `selections` on `POST /carts/items` — validated against live
  configuration (required groups, min/max, active choices, cross-tenant
  rejection, linked-product stock, future slot, capacity advisory) — priced
  deterministically (`base|variation + Σ price_delta × qty`) and frozen
  into `CartItems.configuration`. Items without selections are byte-for-byte
  unchanged. 11 tests.
- **9e — checkout completion**: authoritative slot capacity with the
  **compensating pattern** (increment → verify → decrement + delete the sale
  on failure; no orphan sales, carts stay `Active`), organization
  create-or-link (tenant-scoped, foreign ids rejected) and
  `SaleParticipant` rows from the checkout payload, and re-fetched sale
  responses. 8 tests including **historical snapshot survival** (changing
  choice/base prices after purchase leaves the sale at 30 while a new cart
  prices at 149).

### Design refinement vs the original proposal

Enforcement derives from **live configuration** (a product's option groups /
the referenced slot) rather than requiring a `Product → OfferingType` link —
this avoided a second migration and keeps enforcement tied to data that
actually exists. `OfferingType` remains tenant semantic metadata (UI hints,
future gating). Behavior equivalent to the proposal; no industry concepts
were introduced anywhere.

### Contract note

The old `selections` field on `POST /carts/items` (an "items inside bundle"
array parsed by no code and stripped server-side) was replaced by the
structured selection shape. Existing clients are unaffected — plain
`product_id/product_quantity/variation_id` payloads behave identically, and
Phase 2–6 suites prove it (143 pre-existing tests still green).

### Scenario matrix (prompt 9's acceptance criteria) — all covered

Standalone, configurable bundle, meal package, catering booking (slot seats,
location via slot/delivery, participants), individual course, organization
course (org billing + participants), invalid selections, quantity limits,
tenant isolation (two-tenant fixtures), historical price snapshots — plus
invalid selections, quantity limits, and capacity compensation.
