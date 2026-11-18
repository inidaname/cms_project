// Phase 1 tenant-isolation tests (prompt 1).
// Uses two seeded tenants and proves that one tenant cannot read, mutate, or
// impersonate another tenant through the HTTP boundary.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

const isolationTests = async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  await t.test("user listing without a filter only returns the caller's tenant users", async () => {
    const resA = await app.inject({
      method: "GET",
      url: "/users/tenant/",
      headers: fx.authA,
    });
    assert.equal(resA.statusCode, 200);
    const bodyA = resA.json();
    for (const user of bodyA.data.data) {
      assert.equal(user.tenant_id, fx.tenantA.id);
    }
    assert.ok(!bodyA.data.data.some((u: any) => u.id === fx.ownerB.id));

    const resB = await app.inject({
      method: "GET",
      url: "/users/tenant/",
      headers: fx.authB,
    });
    assert.equal(resB.statusCode, 200);
    const bodyB = resB.json();
    for (const user of bodyB.data.data) {
      assert.equal(user.tenant_id, fx.tenantB.id);
    }
    assert.ok(!bodyB.data.data.some((u: any) => u.id === fx.ownerA.id));
  });

  await t.test("a bearer token from another tenant is rejected on user routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/tenant/",
      headers: fx.crossAB, // tenant-A token + tenant-B API key
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().message, "Token does not belong to this tenant");
  });

  await t.test("a bearer token from another tenant is rejected on cart routes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/carts/",
      headers: fx.crossAB,
      payload: {},
    });
    assert.equal(res.statusCode, 403);
  });

  await t.test("a same-tenant token and key are accepted on user routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/tenant/",
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 200);
  });

  await t.test("admin variation update cannot touch another tenant's variation", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/admin/products/variation",
      headers: fx.authA,
      payload: {
        variation_id: fx.variationB.id,
        type: "Color",
        value: "hacked",
        price: 999,
      },
    });
    assert.equal(res.statusCode, 200);

    // The scoped update matched zero rows: variation B is untouched.
    const variation = await fx.prisma.productVariation.findUnique({
      where: { id: fx.variationB.id },
    });
    assert.equal(variation?.value, "blue");
    assert.equal(Number(variation?.price), 21);
  });

  await t.test("admin variation delete cannot touch another tenant's variation", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/admin/products/variation/${fx.variationB.id}`,
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 200);
    const variation = await fx.prisma.productVariation.findUnique({
      where: { id: fx.variationB.id },
    });
    assert.ok(variation, "variation B must still exist");
  });

  await t.test("product update cannot modify another tenant's product", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/product/${fx.productB.id}`,
      headers: fx.authA,
      payload: { title: "hacked", price: 1 },
    });
    assert.equal(res.statusCode, 404);
    const product = await fx.prisma.product.findUnique({
      where: { id: fx.productB.id },
    });
    assert.equal(product?.title, fx.productB.title);
  });

  await t.test("cart item creation rejects a foreign tenant product", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/carts/items/",
      headers: fx.authAUser,
      payload: { product_id: fx.productB.id, product_quantity: 1 },
    });
    assert.ok(res.statusCode >= 400, `expected failure, got ${res.statusCode}`);
  });

  await t.test("cart creation ignores a foreign tenant_id in the body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/carts/",
      headers: fx.authAUser,
      payload: { tenant_id: fx.tenantB.id },
    });
    assert.equal(res.statusCode, 201);
    const cart = res.json().data;
    assert.equal(cart.tenant_id, fx.tenantA.id);
  });

  await t.test("admin list membership rejects foreign subscribers", async () => {
    const listA = await fx.prisma.list.create({
      data: { tenant_id: fx.tenantA.id, name: `iso1-list-a-${fx.suffix}` },
    });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/admin/lists/add-subscribers",
        headers: fx.authA,
        payload: {
          list_id: listA.id,
          subscriber_ids: [fx.subscriberB.id],
        },
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().message, "Subscribers do not belong to this tenant");

      const memberships = await fx.prisma.listSubscriber.count({
        where: { listId: listA.id },
      });
      assert.equal(memberships, 0);
    } finally {
      await fx.prisma.listSubscriber.deleteMany({ where: { listId: listA.id } });
      await fx.prisma.list.delete({ where: { id: listA.id } });
    }
  });

  await t.test("webhook without a signature is rejected", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: { "content-type": "application/json" },
      payload: {
        event: "account_funded",
        data: {
          reference: `iso1-ref-${fx.suffix}`,
          status: "COMPLETED",
          metadata: { tenant_id: fx.tenantA.id },
        },
      },
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("webhook with an invalid signature is rejected", async () => {
    await fx.prisma.tenantFinecoreConfig.create({
      data: {
        tenant_id: fx.tenantA.id,
        apiKey: `iso1-fc-${fx.suffix}`,
        webhookSecret: "iso1-test-secret",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: {
        "content-type": "application/json",
        "x-webhook-signature": "deadbeef",
        "x-webhook-timestamp": String(Date.now()),
      },
      payload: {
        event: "account_funded",
        data: {
          reference: `iso1-ref-${fx.suffix}`,
          status: "COMPLETED",
          metadata: { tenant_id: fx.tenantA.id },
        },
      },
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().message, "Invalid webhook signature");
  });

  await t.test("webhook missing the timestamp header is rejected", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhook/finecore",
      headers: {
        "content-type": "application/json",
        "x-webhook-signature": "deadbeef",
      },
      payload: {
        event: "account_funded",
        data: {
          reference: `iso1-ref-${fx.suffix}`,
          status: "COMPLETED",
          metadata: { tenant_id: fx.tenantA.id },
        },
      },
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("unrecognized webhook paths require an API key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhook/not-a-real-endpoint",
      payload: {},
    });
    assert.equal(res.statusCode, 401);
    assert.match(res.json().message, /Missing API Key/);
  });

  await t.test("notification recipient must belong to the caller's tenant", async () => {
    // sendFromTemplate resolves the recipient tenant-scoped; the template is
    // tenant-scoped so the whole flow is bound to tenant A.
    const template = await fx.prisma.notificationTemplate.create({
      data: {
        tenant_id: fx.tenantA.id,
        name: `iso1-tpl-${fx.suffix}`,
        type: "IN_APP",
        body: "Hello",
      },
    });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/admin/notifications/send-template",
        headers: fx.authA,
        payload: {
          template: template.name,
          user_id: fx.ownerB.id, // tenant-B user
        },
      });
      // Either rejected, or succeeded without creating any notification for
      // tenant B's user.
      if (res.statusCode < 400) {
        const notification = await fx.prisma.notification.findFirst({
          where: { user_id: fx.ownerB.id },
        });
        assert.ok(!notification, "no notification may be created for a foreign user");
      }
    } finally {
      await fx.prisma.notificationTemplate
        .delete({ where: { id: template.id } })
        .catch(() => {});
      await fx.prisma.notification
        .deleteMany({ where: { tenant_id: fx.tenantA.id } });
    }
  });
};

test("tenant isolation", isolationTests);
