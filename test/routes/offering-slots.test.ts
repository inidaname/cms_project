// Phase 9c: offering slot tests (prompt 9) — scheduling + capacity
// primitive, tenant-scoped, with past-slot and capacity guard behavior.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

const future = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

test("offering slots", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  let slotId = "";

  await t.test("slots attach to tenant-owned products with ordered dates", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productA.id}/slots`,
      headers: fx.authA,
      payload: {
        startsAt: future(60),
        endsAt: future(120),
        capacity: 10,
        location: "Rooftop Hall",
      },
    });
    assert.equal(res.statusCode, 201);
    const slot = res.json().data;
    assert.equal(slot.tenant_id, fx.tenantA.id);
    assert.equal(slot.capacity, 10);
    assert.equal(slot.bookedCount, 0);
    slotId = slot.id;

    // Tenant B cannot attach a slot to tenant A's product.
    const foreign = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productA.id}/slots`,
      headers: fx.authB,
      payload: { startsAt: future(60), endsAt: future(120) },
    });
    assert.equal(foreign.statusCode, 404);
  });

  await t.test("inverted or past-dated slot windows are rejected", async () => {
    const inverted = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productA.id}/slots`,
      headers: fx.authA,
      payload: { startsAt: future(120), endsAt: future(60) },
    });
    assert.equal(inverted.statusCode, 400);
    assert.match(inverted.json().message, /after startsAt/);
  });

  await t.test("listing is tenant-scoped and supports upcoming filter", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/admin/products/${fx.productA.id}/slots`,
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.json().data.length >= 1);

    const foreign = await app.inject({
      method: "GET",
      url: `/admin/products/${fx.productA.id}/slots`,
      headers: fx.authB,
    });
    assert.equal(foreign.json().data.length, 0);

    const upcoming = await app.inject({
      method: "GET",
      url: `/admin/products/${fx.productA.id}/slots?upcoming=true`,
      headers: fx.authA,
    });
    assert.ok(upcoming.json().data.length >= 1);
  });

  await t.test("the capacity guard rejects overbooking and past slots", async () => {
    const slot = await app.prisma.offeringSlot.findUnique({ where: { id: slotId } });
    assert.ok(slot);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OfferingSlotService } = require("../../src/core/offering/offering-slot-service");
    const slotService = new OfferingSlotService(app.prisma);
    assert.equal(await slotService.hasCapacity(fx.tenantA.id, slotId, 10), true);
    assert.equal(await slotService.hasCapacity(fx.tenantA.id, slotId, 11), false);

    // Past slot is not bookable.
    const pastSlot = await app.prisma.offeringSlot.create({
      data: {
        tenant_id: fx.tenantA.id,
        product_id: fx.productA.id,
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });
    assert.equal(await slotService.hasCapacity(fx.tenantA.id, pastSlot.id, 1), false);
  });

  await t.test("slot update and delete are tenant-scoped", async () => {
    const foreign = await app.inject({
      method: "PUT",
      url: `/admin/slots/${slotId}`,
      headers: fx.authB,
      payload: { capacity: 1 },
    });
    assert.equal(foreign.statusCode, 404);

    const update = await app.inject({
      method: "PUT",
      url: `/admin/slots/${slotId}`,
      headers: fx.authA,
      payload: { capacity: 20, notes: "expanded" },
    });
    assert.equal(update.statusCode, 200);
    const after = await app.prisma.offeringSlot.findUnique({ where: { id: slotId } });
    assert.equal(after?.capacity, 20);

    const del = await app.inject({
      method: "DELETE",
      url: `/admin/slots/${slotId}`,
      headers: fx.authA,
    });
    assert.equal(del.statusCode, 200);
    assert.equal(await app.prisma.offeringSlot.findUnique({ where: { id: slotId } }), null);
  });
});
