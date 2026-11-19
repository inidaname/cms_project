// Phase 9b: offering-domain configuration tests (prompt 9).
// Tenant-defined offering types and per-product option groups/choices, with
// strict tenant isolation (two-tenant fixtures).
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

test("offering configuration", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  let typeId = "";
  let groupId = "";
  let choiceId = "";

  await t.test("a tenant can define offering types with behavior flags", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/offering-types",
      headers: fx.authA,
      payload: {
        key: `bundle-${fx.suffix}`,
        name: "Configurable Bundle",
        selectable: true,
        scheduled: false,
        participants: false,
        deliverable: false,
      },
    });
    assert.equal(res.statusCode, 201);
    const created = res.json().data;
    assert.equal(created.tenant_id, fx.tenantA.id);
    assert.equal(created.selectable, true);
    typeId = created.id;
  });

  await t.test("offering type keys are unique per tenant", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/offering-types",
      headers: fx.authA,
      payload: { key: `bundle-${fx.suffix}`, name: "Duplicate" },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /already exists/);
  });

  await t.test("the same key is allowed for a different tenant", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/offering-types",
      headers: fx.authB,
      payload: { key: `bundle-${fx.suffix}`, name: "B's bundle type" },
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.tenant_id, fx.tenantB.id);
  });

  await t.test("offering type listing is tenant-scoped", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/offering-types",
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 200);
    const types = res.json().data;
    assert.ok(types.length >= 1);
    assert.ok(types.every((t: any) => t.tenant_id === fx.tenantA.id));
  });

  await t.test("offering type update and delete are tenant-scoped", async () => {
    const foreignType = await fx.prisma.offeringType.findFirst({
      where: { tenant_id: fx.tenantB.id },
    });
    assert.ok(foreignType);

    const foreignRes = await app.inject({
      method: "PUT",
      url: `/admin/offering-types/${foreignType.id}`,
      headers: fx.authA,
      payload: { name: "hacked" },
    });
    assert.equal(foreignRes.statusCode, 404);

    const update = await app.inject({
      method: "PUT",
      url: `/admin/offering-types/${typeId}`,
      headers: fx.authA,
      payload: { name: "Renamed Bundle", scheduled: true },
    });
    assert.equal(update.statusCode, 200);
    const after = await fx.prisma.offeringType.findUnique({ where: { id: typeId } });
    assert.equal(after?.name, "Renamed Bundle");
    assert.equal(after?.scheduled, true);
  });

  await t.test("a USER token cannot access offering configuration", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/offering-types",
      headers: fx.authAUser,
    });
    assert.equal(res.statusCode, 403);
  });

  await t.test("option groups attach to tenant-owned products only", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productA.id}/option-groups`,
      headers: fx.authA,
      payload: {
        name: "Chocolates",
        required: true,
        min_select: 1,
        max_select: 3,
        position: 0,
      },
    });
    assert.equal(res.statusCode, 201);
    const group = res.json().data;
    assert.equal(group.tenant_id, fx.tenantA.id);
    assert.equal(group.min_select, 1);
    assert.equal(group.max_select, 3);
    groupId = group.id;

    // Tenant B cannot attach a group to tenant A's product.
    const foreign = await app.inject({
      method: "POST",
      url: `/admin/products/${fx.productA.id}/option-groups`,
      headers: fx.authB,
      payload: { name: "Foreign" },
    });
    assert.equal(foreign.statusCode, 404);
  });

  await t.test("choices belong to the group's tenant and may link tenant products", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/option-groups/${groupId}/choices`,
      headers: fx.authA,
      payload: {
        label: "Dark Chocolate Box",
        product_id: fx.productA.id,
        price_delta: 5,
      },
    });
    assert.equal(res.statusCode, 201);
    choiceId = res.json().data.id;
    assert.equal(res.json().data.price_delta, 5);

    // A choice linked to another tenant's product is rejected.
    const foreignLink = await app.inject({
      method: "POST",
      url: `/admin/option-groups/${groupId}/choices`,
      headers: fx.authA,
      payload: { label: "Bad link", product_id: fx.productB.id },
    });
    assert.equal(foreignLink.statusCode, 404);
    assert.match(foreignLink.json().message, /Linked product/);
  });

  await t.test("option group listing includes choices and is tenant-scoped", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/admin/products/${fx.productA.id}/option-groups`,
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 200);
    const groups = res.json().data;
    assert.equal(groups.length, 1);
    assert.equal(groups[0].choices.length, 1);
    assert.equal(groups[0].choices[0].id, choiceId);

    // Tenant B sees nothing for tenant A's product.
    const foreign = await app.inject({
      method: "GET",
      url: `/admin/products/${fx.productA.id}/option-groups`,
      headers: fx.authB,
    });
    assert.equal(foreign.statusCode, 200);
    assert.equal(foreign.json().data.length, 0);
  });

  await t.test("choice updates cannot cross tenants", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/admin/option-choices/${choiceId}`,
      headers: fx.authB,
      payload: { price_delta: 999 },
    });
    assert.equal(res.statusCode, 404);

    const update = await app.inject({
      method: "PUT",
      url: `/admin/option-choices/${choiceId}`,
      headers: fx.authA,
      payload: { price_delta: 7.5, active: false },
    });
    assert.equal(update.statusCode, 200);
    const after = await fx.prisma.optionChoice.findUnique({ where: { id: choiceId } });
    assert.equal(Number(after?.price_delta), 7.5);
    assert.equal(after?.active, false);
  });

  await t.test("deleting a group removes its choices (cascade) and is tenant-scoped", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/admin/option-groups/${groupId}`,
      headers: fx.authB,
    });
    assert.equal(res.statusCode, 404);
    assert.ok(await fx.prisma.optionGroup.findUnique({ where: { id: groupId } }));

    const del = await app.inject({
      method: "DELETE",
      url: `/admin/option-groups/${groupId}`,
      headers: fx.authA,
    });
    assert.equal(del.statusCode, 200);
    assert.equal(await fx.prisma.optionGroup.findUnique({ where: { id: groupId } }), null);
    assert.equal(await fx.prisma.optionChoice.findUnique({ where: { id: choiceId } }), null);
  });

  await t.test("unknown offering type ids 404 within the tenant", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/admin/offering-types/${fx.tenantB.id}`,
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 404);
  });
});
