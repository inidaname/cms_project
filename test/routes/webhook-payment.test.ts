// Phase 2: webhook and payment state tests (prompt 5, priority 4).
// Covers signature verification paths and a signed happy-path webhook that
// transitions payment, cart, and sale state.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";
import { hmacSha256Hex } from "../../src/helpers/webcrypto";

const SECRET = "iso1-webhook-test-secret";

async function signedHeaders(payload: object, overrides: Record<string, string> = {}) {
  const raw = JSON.stringify(payload);
  const signature = await hmacSha256Hex(raw, SECRET);
  return {
    "content-type": "application/json",
    "x-webhook-signature": signature,
    "x-webhook-timestamp": String(Date.now()),
    ...overrides,
  };
}

test("finecore webhook processing", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  await fx.prisma.tenantFinecoreConfig.create({
    data: {
      tenant_id: fx.tenantA.id,
      apiKey: `iso1-fc-${fx.suffix}`,
      webhookSecret: SECRET,
    },
  });

  await t.test("a validly signed webhook for an unknown payment is acknowledged", async () => {
    const payload = {
      event: "account_funded",
      data: {
        reference: `iso1-unknown-${fx.suffix}`,
        status: "COMPLETED",
        metadata: { tenant_id: fx.tenantA.id },
      },
    };
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: await signedHeaders(payload),
      payload,
    });
    assert.equal(res.statusCode, 200);

    const payments = await fx.prisma.payments.count({
      where: { reference: payload.data.reference },
    });
    assert.equal(payments, 0, "no payment record may be created");
  });

  await t.test("a stale webhook timestamp is rejected", async () => {
    const payload = {
      event: "account_funded",
      data: {
        reference: `iso1-stale-${fx.suffix}`,
        status: "COMPLETED",
        metadata: { tenant_id: fx.tenantA.id },
      },
    };
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const raw = JSON.stringify(payload);
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: {
        "content-type": "application/json",
        "x-webhook-signature": await hmacSha256Hex(raw, SECRET),
        "x-webhook-timestamp": String(new Date(stale).getTime()),
      },
      payload,
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /timestamp expired/);
  });

  await t.test("a completed-payment webhook updates payment, cart and sale state", async () => {
    // Seed a cart → sale → pending payment for tenant A's user.
    const cart = await fx.prisma.cart.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        totalValue: 22,
        status: "Active",
      },
    });
    const sale = await fx.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        amount: 22,
      },
    });
    const payment = await fx.prisma.payments.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        sales_id: sale.id,
        reference: `iso1-pay-${fx.suffix}`,
        amount: 22,
        status: "Pending",
      },
    });

    const payload = {
      event: "account_funded",
      data: {
        reference: payment.reference,
        status: "COMPLETED",
        metadata: { tenant_id: fx.tenantA.id },
      },
    };
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: await signedHeaders(payload),
      payload,
    });
    assert.equal(res.statusCode, 200);

    const updatedPayment = await fx.prisma.payments.findUnique({
      where: { id: payment.id },
    });
    assert.equal(updatedPayment?.status, "Success");

    const updatedCart = await fx.prisma.cart.findUnique({
      where: { id: cart.id },
    });
    assert.equal(updatedCart?.status, "Checkedout");

    const updatedSale = await fx.prisma.sales.findUnique({
      where: { id: sale.id },
    });
    assert.equal(updatedSale?.status, "Paid");

    // A replayed delivery must not corrupt anything (same result, 200).
    const replay = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: await signedHeaders(payload),
      payload,
    });
    assert.equal(replay.statusCode, 200);
    const afterReplay = await fx.prisma.payments.findUnique({
      where: { id: payment.id },
    });
    assert.equal(afterReplay?.status, "Success");
    assert.equal(
      (await fx.prisma.payments.count({
        where: { sales_id: sale.id },
      })),
      1,
      "replay must not duplicate payment records",
    );
  });

  await t.test("a late FAILED webhook cannot downgrade a completed payment", async () => {
    const cart = await fx.prisma.cart.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        totalValue: 15,
        status: "Checkedout",
      },
    });
    const sale = await fx.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        amount: 15,
        status: "Paid",
      },
    });
    const payment = await fx.prisma.payments.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        sales_id: sale.id,
        reference: `iso1-done-${fx.suffix}`,
        amount: 15,
        status: "Success",
      },
    });

    const payload = {
      event: "account_funded",
      data: {
        reference: payment.reference,
        status: "FAILED",
        metadata: { tenant_id: fx.tenantA.id },
      },
    };
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: await signedHeaders(payload),
      payload,
    });
    assert.equal(res.statusCode, 200);

    const after = await fx.prisma.payments.findUnique({ where: { id: payment.id } });
    assert.equal(after?.status, "Success", "Success is terminal");
    const afterCart = await fx.prisma.cart.findUnique({ where: { id: cart.id } });
    assert.equal(afterCart?.status, "Checkedout");
  });

  await t.test("a late COMPLETED webhook cannot resurrect a returned sale", async () => {
    const cart = await fx.prisma.cart.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        totalValue: 30,
        status: "Checkedout",
      },
    });
    const sale = await fx.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        amount: 30,
        status: "Returned",
      },
    });
    const payment = await fx.prisma.payments.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        sales_id: sale.id,
        reference: `iso1-returned-${fx.suffix}`,
        amount: 30,
        status: "Pending",
      },
    });

    const payload = {
      event: "account_funded",
      data: {
        reference: payment.reference,
        status: "COMPLETED",
        metadata: { tenant_id: fx.tenantA.id },
      },
    };
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: await signedHeaders(payload),
      payload,
    });
    assert.equal(res.statusCode, 200);

    const afterPayment = await fx.prisma.payments.findUnique({ where: { id: payment.id } });
    assert.equal(afterPayment?.status, "Success");
    const afterSale = await fx.prisma.sales.findUnique({ where: { id: sale.id } });
    assert.equal(afterSale?.status, "Returned", "returned sale stays returned");
  });

  await t.test("a failed-payment webhook keeps the sale unpaid but records the payment status", async () => {
    const cart = await fx.prisma.cart.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        totalValue: 10,
        status: "Active",
      },
    });
    const sale = await fx.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        amount: 10,
      },
    });
    const payment = await fx.prisma.payments.create({
      data: {
        tenant_id: fx.tenantA.id,
        user_id: fx.userA.id,
        sales_id: sale.id,
        reference: `iso1-fail-${fx.suffix}`,
        amount: 10,
        status: "Pending",
      },
    });

    const payload = {
      event: "account_funded",
      data: {
        reference: payment.reference,
        status: "FAILED",
        metadata: { tenant_id: fx.tenantA.id },
      },
    };
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: await signedHeaders(payload),
      payload,
    });
    assert.equal(res.statusCode, 200);

    const updatedPayment = await fx.prisma.payments.findUnique({
      where: { id: payment.id },
    });
    assert.equal(updatedPayment?.status, "Failed");

    const updatedCart = await fx.prisma.cart.findUnique({
      where: { id: cart.id },
    });
    assert.equal(updatedCart?.status, "Active", "cart stays active on failure");
  });
});
