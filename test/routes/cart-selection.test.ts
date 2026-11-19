// Phase 9d: generalized cart selection tests (prompt 9).
// Structured selections (option groups + choices + slot) are validated
// against live tenant configuration, priced deterministically, and frozen
// into CartItems.configuration. Items without selections behave exactly as
// before (covered by the Phase 2 suites).
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

const future = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

test("cart selections", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  // Configure tenant A: a selectable product with one required group
  // (min 1 / max 2) with priced choices, and a capacity-limited slot.
  const groupRes = await app.inject({
    method: "POST",
    url: `/admin/products/${fx.productA.id}/option-groups`,
    headers: fx.authA,
    payload: { name: "Extras", required: true, min_select: 1, max_select: 2 },
  });
  const group = groupRes.json().data;

  const wrapRes = await app.inject({
    method: "POST",
    url: `/admin/option-groups/${group.id}/choices`,
    headers: fx.authA,
    payload: { label: "Gift wrap", price_delta: 5 },
  });
  const wrapChoice = wrapRes.json().data;

  const cardRes = await app.inject({
    method: "POST",
    url: `/admin/option-groups/${group.id}/choices`,
    headers: fx.authA,
    payload: { label: "Card", price_delta: 2, active: false },
  });
  const cardChoice = cardRes.json().data;

  const slotRes = await app.inject({
    method: "POST",
    url: `/admin/products/${fx.productA.id}/slots`,
    headers: fx.authA,
    payload: { startsAt: future(60), endsAt: future(120), capacity: 5, location: "Hall A" },
  });
  const slot = slotRes.json().data;

  const addItem = (payload: Record<string, unknown>) =>
    app.inject({
      method: "POST",
      url: "/carts/items",
      headers: fx.authAUser,
      payload,
    });

  await t.test("a valid selection is priced deterministically and snapshotted", async () => {
    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 2,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: wrapChoice.id, quantity: 2 }] }],
      },
    });
    assert.equal(res.statusCode, 201);

    // base 10 + (delta 5 × 2) = 20 per unit; value = 2 × 20 = 40.
    const line = await fx.prisma.cartItems.findFirst({
      where: { product_id: fx.productA.id },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(line);
    assert.equal(Number(line?.unit_price), 20);
    assert.equal(Number(line?.value), 40);
    const config = line?.configuration as any;
    assert.equal(config.groups.length, 1);
    assert.equal(config.groups[0].group_id, group.id);
    assert.equal(config.groups[0].choices[0].choice_id, wrapChoice.id);
    assert.equal(config.groups[0].choices[0].quantity, 2);
    assert.equal(config.slot_id, null);
  });

  await t.test("a missing required group is rejected", async () => {
    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: { groups: [] },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /is required/);
  });

  await t.test("min/max selection rules are enforced", async () => {
    const third = await app.inject({
      method: "POST",
      url: `/admin/option-groups/${group.id}/choices`,
      headers: fx.authA,
      payload: { label: "Third option", price_delta: 1 },
    });
    const thirdChoice = third.json().data;

    const fourth = await app.inject({
      method: "POST",
      url: `/admin/option-groups/${group.id}/choices`,
      headers: fx.authA,
      payload: { label: "Fourth option", price_delta: 1 },
    });
    const fourthChoice = fourth.json().data;

    const over = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: {
        groups: [{
          group_id: group.id,
          choices: [
            { choice_id: wrapChoice.id, quantity: 1 },
            { choice_id: thirdChoice.id, quantity: 1 },
            { choice_id: fourthChoice.id, quantity: 1 },
          ],
        }],
      },
    });
    assert.equal(over.statusCode, 400);
    assert.match(over.json().message, /at most 2/);
    await app.prisma.optionChoice.delete({ where: { id: thirdChoice.id } });
    await app.prisma.optionChoice.delete({ where: { id: fourthChoice.id } });
  });

  await t.test("unknown or cross-tenant groups and choices are rejected", async () => {
    // Foreign group: tenant B creates its own group on its own product.
    const foreignGroupRes = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productB.id}/option-groups`,
      headers: fx.authB,
      payload: { name: "Foreign group", required: false, min_select: 0, max_select: 1 },
    });
    const foreignGroup = foreignGroupRes.json().data;

    const foreignGroupOnA = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: { groups: [{ group_id: foreignGroup.id, choices: [] }] },
    });
    assert.equal(foreignGroupOnA.statusCode, 400);
    assert.match(foreignGroupOnA.json().message, /does not belong/);

    const unknownChoice = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: foreignGroup.id, quantity: 1 }] }],
      },
    });
    assert.equal(unknownChoice.statusCode, 400);
    assert.match(unknownChoice.json().message, /does not belong to group/);
  });

  await t.test("inactive choices are rejected", async () => {
    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: cardChoice.id, quantity: 1 }] }],
      },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /not available/);
  });

  await t.test("slot selection is validated and snapshotted", async () => {
    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 2,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: wrapChoice.id, quantity: 1 }] }],
        slot_id: slot.id,
        participants: 2,
      },
    });
    assert.equal(res.statusCode, 201);
    const line = await fx.prisma.cartItems.findFirst({
      where: { product_id: fx.productA.id, configuration: { not: undefined } },
      orderBy: { createdAt: "desc" },
    });
    const config = line?.configuration as any;
    assert.equal(config.slot_id, slot.id);
    assert.equal(config.participants, 2);
  });

  await t.test("a slot from another tenant's product is rejected", async () => {
    const foreignSlotRes = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productB.id}/slots`,
      headers: fx.authB,
      payload: { startsAt: future(60), endsAt: future(120) },
    });
    const foreignSlot = foreignSlotRes.json().data;

    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: wrapChoice.id, quantity: 1 }] }],
        slot_id: foreignSlot.id,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /does not belong to this offering/);
  });

  await t.test("a fully-booked slot is rejected (advisory)", async () => {
    await app.prisma.offeringSlot.update({
      where: { id: slot.id },
      data: { bookedCount: 5 }, // at capacity
    });

    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: wrapChoice.id, quantity: 1 }] }],
        slot_id: slot.id,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /fully booked/);

    await app.prisma.offeringSlot.update({ where: { id: slot.id }, data: { bookedCount: 0 } });
  });

  await t.test("a past slot is rejected", async () => {
    const pastSlot = await app.prisma.offeringSlot.create({
      data: {
        tenant_id: fx.tenantA.id,
        product_id: fx.productA.id,
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: wrapChoice.id, quantity: 1 }] }],
        slot_id: pastSlot.id,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /already started/);
  });

  await t.test("linked choice products are stock-checked (advisory)", async () => {
    const zeroStock = await fx.prisma.product.create({
      data: {
        tenant_id: fx.tenantA.id,
        title: `iso9-zero-${fx.suffix}`,
        description: "zero stock product",
        price: 3,
        quantity: 0,
      },
    });

    const linkedRes = await app.inject({
      method: "POST",
      url: `/admin/option-groups/${group.id}/choices`,
      headers: fx.authA,
      payload: { label: "Out of stock extra", product_id: zeroStock.id, price_delta: 1 },
    });
    const linkedChoice = linkedRes.json().data;

    const res = await addItem({
      product_id: fx.productA.id,
      product_quantity: 1,
      selections: {
        groups: [{ group_id: group.id, choices: [{ choice_id: linkedChoice.id, quantity: 1 }] }],
      },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /enough stock/);
  });
});
