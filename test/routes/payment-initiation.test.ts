// Phase 4: payment initiation guards (prompt 3).
// These tests exercise the pre-provider guards only (no Finecore API call is
// made): sale binding, authoritative amount, and idempotent initiation.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

test("payment initiation guards", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  await fx.prisma.tenantFinecoreConfig.create({
    data: {
      tenant_id: fx.tenantA.id,
      apiKey: `iso1-fc-init-${fx.suffix}`,
      webhookSecret: "iso1-init-secret",
    },
  });

  const initiate = (payload: Record<string, unknown>) =>
    app.inject({
      method: "POST",
      url: "/payments/checkout-link",
      headers: fx.authAUser,
      payload: {
        success_url: "https://example.test/success",
        cancel_url: "https://example.test/cancel",
        ...payload,
      },
    });

  // Carts must contain at least one line item to pass the empty-cart guard.
  const seedCart = async (data: {
    totalValue: number;
    status: "Active" | "Checkedout";
    user_id?: string;
    tenant_id?: string;
  }) => {
    const cart = await fx.prisma.cart.create({
      data: {
        tenant_id: data.tenant_id ?? fx.tenantA.id,
        user_id: data.user_id ?? fx.userA.id,
        totalValue: data.totalValue,
        status: data.status,
      },
    });
    await fx.prisma.cartItems.create({
      data: {
        cart_id: cart.id,
        product_id: fx.productA.id,
        product_quantity: 1,
        unit_price: data.totalValue,
        value: data.totalValue,
      },
    });
    return cart;
  };

  await t.test("initiation requires a checked-out cart", async () => {
    const cart = await seedCart({ totalValue: 10, status: "Active" });

    const res = await initiate({ cart_id: cart.id });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /not been checked out/);

    const payments = await fx.prisma.payments.count({
      where: { tenant_id: fx.tenantA.id },
    });
    assert.equal(payments, 0, "no payment row may be created");
  });

  await t.test("initiation rejects an amount that differs from the cart total", async () => {
    const cart = await seedCart({ totalValue: 50, status: "Active" });
    await fx.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        amount: 50,
      },
    });

    const res = await initiate({ cart_id: cart.id, amount: 5 });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /does not match the cart total/);
  });

  await t.test("initiation is idempotent per sale and never double-charges", async () => {
    const cart = await seedCart({ totalValue: 25, status: "Active" });
    const sale = await fx.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        amount: 25,
      },
    });
    await fx.prisma.payments.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        sales_id: sale.id,
        reference: `iso1-init-${fx.suffix}`,
        amount: 25,
        status: "Pending",
      },
    });

    const res = await initiate({ cart_id: cart.id });
    assert.equal(res.statusCode, 409);
    assert.match(res.json().message, /already initiated/);

    const payments = await fx.prisma.payments.count({
      where: { sales_id: sale.id },
    });
    assert.equal(payments, 1, "no duplicate payment row");
  });

  await t.test("initiation is rejected once the payment completed", async () => {
    const cart = await seedCart({ totalValue: 75, status: "Checkedout" });
    const sale = await fx.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        amount: 75,
        status: "Paid",
      },
    });
    await fx.prisma.payments.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        sales_id: sale.id,
        reference: `iso1-paid-${fx.suffix}`,
        amount: 75,
        status: "Success",
      },
    });

    const res = await initiate({ cart_id: cart.id });
    assert.equal(res.statusCode, 409);
    assert.match(res.json().message, /already completed/);
  });

  await t.test("another tenant's cart cannot be paid for", async () => {
    const cart = await seedCart({
      totalValue: 10,
      status: "Active",
      tenant_id: fx.tenantB.id,
      user_id: fx.ownerB.id,
    });

    const res = await initiate({ cart_id: cart.id });
    assert.equal(res.statusCode, 404);
    assert.match(res.json().message, /Cart not found/);
  });
});
