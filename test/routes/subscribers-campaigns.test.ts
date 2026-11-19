// Phase 2: subscriber and campaign behavior tests (prompt 5, priority 7).
// Positive CRUD plus tenant-scoped campaign sends (no live email delivery is
// triggered by these paths — they only create EmailSend records).
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

test("subscribers and campaigns", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  const subscriberEmail = `iso1-sub-${fx.suffix}@iso.test`;
  let listId = "";
  let campaignId = "";

  await t.test("admin can create a subscriber", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/subscribers",
      headers: fx.authA,
      payload: { email: subscriberEmail, name: "Iso Subscriber" },
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.tenant_id, fx.tenantA.id);
  });

  await t.test("admin can create a list", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/lists",
      headers: fx.authA,
      payload: { name: `iso1-list-${fx.suffix}` },
    });
    assert.equal(res.statusCode, 201);
    listId = res.json().data.id;
    assert.equal(listId ? typeof listId : "", "string");
  });

  await t.test("admin can add a tenant subscriber to a tenant list", async () => {
    const subscriber = await fx.prisma.subscriber.findFirst({
      where: { tenant_id: fx.tenantA.id, email: subscriberEmail },
    });
    assert.ok(subscriber);

    const res = await app.inject({
      method: "POST",
      url: "/admin/lists/add-subscribers",
      headers: fx.authA,
      payload: { list_id: listId, subscriber_ids: [subscriber.id] },
    });
    assert.equal(res.statusCode, 200);
    // The declared response contract now passes the result through.
    assert.equal(res.json().data.added, 1);

    const memberships = await fx.prisma.listSubscriber.count({
      where: { listId },
    });
    assert.equal(memberships, 1);
  });

  await t.test("admin can create a campaign", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/campaigns",
      headers: fx.authA,
      payload: {
        subject: `Iso campaign ${fx.suffix}`,
        htmlBody: "<p>Hello</p>",
      },
    });
    assert.equal(res.statusCode, 201);
    campaignId = res.json().data.id;
    assert.equal(res.json().data.tenant_id, fx.tenantA.id);
  });

  await t.test("campaign send rejects a foreign list", async () => {
    const foreignList = await fx.prisma.list.create({
      data: { tenant_id: fx.tenantB.id, name: `iso1-foreign-${fx.suffix}` },
    });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/admin/campaigns/send",
        headers: fx.authA,
        payload: { campaign_id: campaignId, list_id: foreignList.id },
      });
      assert.equal(res.statusCode, 400);
      assert.match(res.json().message, /List not found/);

      const sends = await fx.prisma.emailSend.count({
        where: { campaignId },
      });
      assert.equal(sends, 0);
    } finally {
      await fx.prisma.list
        .delete({ where: { id: foreignList.id } })
        .catch(() => {});
    }
  });

  await t.test("campaign send schedules sends only for tenant subscribers", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/campaigns/send",
      headers: fx.authA,
      payload: { campaign_id: campaignId, list_id: listId },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.scheduled, 1);

    const sends = await fx.prisma.emailSend.findMany({
      where: { campaignId },
    });
    assert.equal(sends.length, 1);
    assert.equal(sends[0].tenant_id, fx.tenantA.id);

    // Tenant B's subscriber must never be targeted.
    const foreignTarget = sends.some((s) => s.subscriberId === fx.subscriberB.id);
    assert.ok(!foreignTarget);
  });

  await t.test("campaign listing is paginated and tenant-scoped", async () => {
    await app.inject({
      method: "POST",
      url: "/admin/campaigns",
      headers: fx.authB,
      payload: {
        subject: `Foreign campaign ${fx.suffix}`,
        htmlBody: "<p>B</p>",
      },
    });

    const resA = await app.inject({
      method: "GET",
      url: "/admin/campaigns",
      headers: fx.authA,
    });
    assert.equal(resA.statusCode, 200);
    const payloadA = resA.json().data;
    assert.ok(Array.isArray(payloadA.data), "list response must be paginated");
    assert.ok(payloadA.metadata, "list response must include pagination metadata");
    assert.ok(payloadA.metadata.total >= 1);
    assert.ok(payloadA.data.every((c: any) => c.tenant_id === fx.tenantA.id));
    assert.ok(!payloadA.data.some((c: any) => c.subject.startsWith("Foreign campaign")));

    const resB = await app.inject({
      method: "GET",
      url: "/admin/campaigns",
      headers: fx.authB,
    });
    assert.equal(resB.statusCode, 200);
    const payloadB = resB.json().data;
    assert.ok(payloadB.data.some((c: any) => c.subject.startsWith("Foreign campaign")));
    assert.ok(!payloadB.data.some((c: any) => c.subject.startsWith("Iso campaign")));
  });
});
