// Phase 9e: checkout offering tests (prompt 9) — organization/participant
// attachment, authoritative slot capacity with compensation, and the
// scenario matrix from the design doc.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

const future = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

test("checkout offering flows", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  // Shared configuration for tenant A: configurable product (base 10, one
  // required group with a +5 choice) and a capacity-2 slot.
  const groupRes = await app.inject({
    method: "POST",
    url: `/admin/products/${fx.productA.id}/option-groups`,
    headers: fx.authA,
    payload: { name: "Extras", required: true, min_select: 1, max_select: 2 },
  });
  const group = groupRes.json().data;

  const choiceRes = await app.inject({
    method: "POST",
    url: `/admin/option-groups/${group.id}/choices`,
    headers: fx.authA,
    payload: { label: "Premium packaging", price_delta: 5 },
  });
  const choice = choiceRes.json().data;

  const slotRes = await app.inject({
    method: "POST",
    url: `/admin/products/${fx.productA.id}/slots`,
    headers: fx.authA,
    payload: { startsAt: future(90), endsAt: future(180), capacity: 2, location: "Main Hall" },
  });
  const slot = slotRes.json().data;

  // One-time cleanup: remove the user's leftover active carts from any
  // earlier compensated-failed checkouts, so `POST /carts/` dedupe cannot
  // hand a stale cart to the first test. Within tests, carts are explicit.
  const staleCarts = await fx.prisma.cart.findMany({
    where: { tenant_id: fx.tenantA.id, user_id: fx.userA.id, status: "Active" },
    select: { id: true },
  });
  if (staleCarts.length > 0) {
    await fx.prisma.cartItems.deleteMany({
      where: { cart_id: { in: staleCarts.map((c) => c.id) } },
    });
    await fx.prisma.cart.deleteMany({
      where: { id: { in: staleCarts.map((c) => c.id) } },
    });
  }

  // Every test uses an explicit, isolated cart: createCart's active-cart
  // dedupe would otherwise hand leftover active carts (e.g. from a
  // compensated failed checkout) to later tests.
  const newCart = async () => {
    // Create the cart directly: POST /carts dedupes to the user's active
    // cart, which would merge lines across a test's carts (both "carts"
    // becoming the same row).
    return await fx.prisma.cart.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        totalValue: 0,
      },
    });
  };

  const createSlot = async (capacity: number | null, startMinutes: number, endMinutes: number) => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productA.id}/slots`,
      headers: fx.authA,
      payload: {
        startsAt: future(startMinutes),
        endsAt: future(endMinutes),
        capacity,
        location: "Main Hall",
      },
    });
    assert.equal(res.statusCode, 201);
    return res.json().data;
  };

  const addConfiguredItem = async (headers: Record<string, string>, quantity: number, slotId?: string) => {
    const cart = await newCart();
    return await app.inject({
      method: "POST",
      url: `/carts/items/${cart.id}`,
      headers,
      payload: {
        product_id: fx.productA.id,
        product_quantity: quantity,
        selections: {
          groups: [{ group_id: group.id, choices: [{ choice_id: choice.id, quantity: 1 }] }],
          ...(slotId && { slot_id: slotId }),
        },
      },
    });
  };

  await t.test("a catering-style booking: selection, slot seats, and participants flow to the sale", async () => {
    const cartRes = await addConfiguredItem(fx.authAUser, 2, slot.id);
    assert.equal(cartRes.statusCode, 201);
    const cartId = cartRes.json().data.id;

    const checkout = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: {
        cart_id: cartId,
        participants: [
          { name: "Guest One", email: "g1@example.test", role: "attendee" },
          { name: "Guest Two", role: "attendee" },
        ],
      },
    });
    assert.equal(checkout.statusCode, 201);
    const sale = checkout.json().data;
    assert.equal(sale.amount, 30); // (10 + 5) × 2, snapshotted at add-time

    const bookedSlot = await fx.prisma.offeringSlot.findUnique({ where: { id: slot.id } });
    assert.equal(bookedSlot?.bookedCount, 2, "slot seats incremented by item quantity");

    const participants = await fx.prisma.saleParticipant.findMany({
      where: { sale_id: sale.id },
    });
    assert.equal(participants.length, 2);
    assert.equal(participants[0].tenant_id, fx.tenantA.id);
    assert.ok(participants.some((p) => p.role === "attendee"));

    // The cart snapshot survives: configuration frozen at add-time.
    const line = await fx.prisma.cartItems.findFirst({ where: { cart_id: cartId } });
    const config: any = line?.configuration;
    assert.equal(config.groups[0].choices[0].choice_id, choice.id);
    assert.equal(config.slot_id, slot.id);
  });

  await t.test("an organization purchase: create-or-link by name, tenant-scoped", async () => {
    const cartId = (await newCart()).id;
    await app.inject({
      method: "POST",
      url: `/carts/items/${cartId}`,
      headers: fx.authAUser,
      payload: { product_id: fx.productA.id, product_quantity: 1 },
    });

    const checkout = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: {
        cart_id: cartId,
        organization: {
          name: `Acme Corp ${fx.suffix}`,
          contactEmail: "billing@acme.test",
          address: "1 Acme Way",
        },
        participants: [{ name: "Learner One", role: "learner" }],
      },
    });
    assert.equal(checkout.statusCode, 201);
    const sale = checkout.json().data;
    assert.ok(sale.organization_id);

    const org = await fx.prisma.organization.findUnique({
      where: { id: sale.organization_id },
    });
    assert.equal(org?.tenant_id, fx.tenantA.id);
    assert.equal(org?.contactEmail, "billing@acme.test");

    // A second checkout with the same name links to the same organization.
    const cart2 = (await newCart()).id;
    await app.inject({
      method: "POST",
      url: `/carts/items/${cart2}`,
      headers: fx.authAUser,
      payload: { product_id: fx.productA.id, product_quantity: 1 },
    });
    const checkout2 = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cart2, organization: { name: `Acme Corp ${fx.suffix}` } },
    });
    assert.equal(checkout2.json().data.organization_id, sale.organization_id);

    // Course scenario shape: participant rows carry the tenant-defined role.
    const learners = await fx.prisma.saleParticipant.findMany({
      where: { sale_id: checkout2.json().data.id },
    });
    assert.equal(learners.length, 0); // this checkout passed no participants
    const firstLearners = await fx.prisma.saleParticipant.findMany({
      where: { sale_id: sale.id, role: "learner" },
    });
    assert.equal(firstLearners.length, 1);
  });

  await t.test("a foreign organization id is rejected", async () => {
    const cartId = (await newCart()).id;
    await app.inject({
      method: "POST",
      url: `/carts/items/${cartId}`,
      headers: fx.authAUser,
      payload: { product_id: fx.productA.id, product_quantity: 1 },
    });

    const foreignOrg = await fx.prisma.organization.create({
      data: { tenant_id: fx.tenantB.id, name: `Foreign Org ${fx.suffix}` },
    });

    const checkout = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cartId, organization: { id: foreignOrg.id } },
    });
    assert.equal(checkout.statusCode, 400);
    assert.match(checkout.json().message, /Organization not found/);

    // The sale must not survive the failed checkout.
    const sales = await fx.prisma.sales.count({ where: { cart_id: cartId } });
    assert.equal(sales, 0);
    const cart = await fx.prisma.cart.findUnique({ where: { id: cartId } });
    assert.equal(cart?.status, "Active");
  });

  await t.test("slot capacity is authoritative at checkout with full compensation", async () => {
    const privateSlot = await createSlot(2, 90, 180);

    // Capacity 2. Two carts of qty 2 each pass the advisory check
    // (bookedCount is still 0 for both), but only one can check out.
    const cartA = await addConfiguredItem(fx.authAUser, 2, privateSlot.id);
    const cartB = await addConfiguredItem(fx.authAUser, 2, privateSlot.id);
    assert.equal(cartA.statusCode, 201);
    assert.equal(cartB.statusCode, 201);

    const checkoutA = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cartA.json().data.id },
    });
    assert.equal(checkoutA.statusCode, 201, checkoutA.body);
    assert.equal(
      (await fx.prisma.offeringSlot.findUnique({ where: { id: privateSlot.id } }))?.bookedCount,
      2,
    );

    const checkoutB = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cartB.json().data.id },
    });
    assert.equal(checkoutB.statusCode, 409);
    assert.match(checkoutB.json().message, /fully booked/);

    // Compensation: bookedCount back to 2, no orphan sale, cart still active.
    const slotAfter = await fx.prisma.offeringSlot.findUnique({ where: { id: privateSlot.id } });
    assert.equal(slotAfter?.bookedCount, 2);
    const orphanSales = await fx.prisma.sales.count({ where: { cart_id: cartB.json().data.id } });
    assert.equal(orphanSales, 0);
    const cartAfter = await fx.prisma.cart.findUnique({ where: { id: cartB.json().data.id } });
    assert.equal(cartAfter?.status, "Active");
  });

  await t.test("a slot that starts before checkout is rejected with compensation", async () => {
    const privateSlot = await createSlot(5, 90, 180);
    const cartRes = await addConfiguredItem(fx.authAUser, 1, privateSlot.id);
    const cartId = cartRes.json().data.id;
    assert.equal(cartRes.statusCode, 201);

    // The slot window passes between add-to-cart and checkout.
    await app.inject({
      method: "PUT",
      url: `/admin/slots/${privateSlot.id}`,
      headers: fx.authA,
      payload: {
        startsAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    });

    const checkout = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cartId },
    });
    assert.equal(checkout.statusCode, 409);
    assert.match(checkout.json().message, /already started/);

    const slotAfter = await fx.prisma.offeringSlot.findUnique({ where: { id: privateSlot.id } });
    assert.equal(slotAfter?.bookedCount, 0, "increment compensated");
    const orphanSales = await fx.prisma.sales.count({ where: { cart_id: cartId } });
    assert.equal(orphanSales, 0);
  });

  await t.test("historical snapshots survive offering changes after purchase", async () => {
    const privateSlot = await createSlot(5, 90, 180);

    // Add and check out a configured item, then change the live choice price.
    const cartRes = await addConfiguredItem(fx.authAUser, 2, privateSlot.id);
    const cartId = cartRes.json().data.id;
    const checkout = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cartId },
    });
    assert.equal(checkout.statusCode, 201);
    const saleId = checkout.json().data.id;
    assert.equal(checkout.json().data.amount, 30);

    // The offering changes AFTER purchase: choice price and base price move.
    await app.inject({
      method: "PUT",
      url: `/admin/option-choices/${choice.id}`,
      headers: fx.authA,
      payload: { price_delta: 50 },
    });
    await fx.prisma.product.update({
      where: { id: fx.productA.id },
      data: { price: 99 },
    });

    // The sale and its line keep the purchase-time configuration and price.
    const sale = await fx.prisma.sales.findUnique({ where: { id: saleId } });
    assert.equal(sale?.amount, 30);
    const line = await fx.prisma.cartItems.findFirst({ where: { cart_id: cartId } });
    assert.equal(Number(line?.unit_price), 15);
    const config: any = line?.configuration;
    assert.equal(config.groups[0].choices[0].choice_id, choice.id);

    // A NEW cart prices with the new configuration (base 99 + delta 50).
    const cartNew = await app.inject({
      method: "POST",
      url: "/carts/items",
      headers: fx.authAUser,
      payload: {
        product_id: fx.productA.id,
        product_quantity: 1,
        selections: {
          groups: [{ group_id: group.id, choices: [{ choice_id: choice.id, quantity: 1 }] }],
        },
      },
    });
    assert.equal(cartNew.statusCode, 201);
    const newLine = await fx.prisma.cartItems.findFirst({
      where: { cart_id: cartNew.json().data.id },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(Number(newLine?.unit_price), 149);
  });

  await t.test("an individual course purchase: single participant for the buyer", async () => {
    const cartId = (await newCart()).id;
    await app.inject({
      method: "POST",
      url: `/carts/items/${cartId}`,
      headers: fx.authAUser,
      payload: { product_id: fx.productA.id, product_quantity: 1 },
    });

    const checkout = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: {
        cart_id: cartId,
        participants: [{ name: fx.userA.name ?? "Buyer", email: fx.userA.email, role: "learner" }],
      },
    });
    assert.equal(checkout.statusCode, 201);

    const participants = await fx.prisma.saleParticipant.findMany({
      where: { sale_id: checkout.json().data.id },
    });
    assert.equal(participants.length, 1);
    assert.equal(participants[0].email, fx.userA.email);
  });
});
