// Phase 2: authentication and role enforcement tests (prompt 5, priority 2).
// Positive and negative cases for API keys, bearer tokens, tenant status,
// and role checks at the HTTP boundary.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

test("authentication and role enforcement", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  // NOTE on ordering: routes guarded by app.authenticate (onRequest) fail
  // with 401 on a missing bearer token before the API-key check runs; the
  // API-key behaviors below are asserted on /product/ which has no
  // authenticate guard.
  await t.test("missing API key is rejected with 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/product/",
    });
    assert.equal(res.statusCode, 401);
    assert.match(res.json().message, /Missing API Key/);
  });

  await t.test("an invalid API key is rejected with 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/product/",
      headers: { "x-api-key": "iso1-not-a-real-key" },
    });
    assert.equal(res.statusCode, 403);
    assert.match(res.json().message, /Invalid API key/);
  });

  await t.test("a suspended tenant's API key is rejected with 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/product/",
      headers: fx.authSuspended,
    });
    assert.equal(res.statusCode, 403);
    assert.match(res.json().message, /suspended/i);
  });

  await t.test("a bearer-protected route rejects missing credentials with 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/tenant/",
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("admin routes require a bearer token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: { "x-api-key": fx.tenantA.apiKey },
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("an invalid bearer token is rejected with 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: {
        "x-api-key": fx.tenantA.apiKey,
        authorization: "Bearer not-a-real-jwt",
      },
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("a USER role token cannot access admin routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: fx.authAUser,
    });
    assert.equal(res.statusCode, 403);
    assert.match(res.json().message, /Admin access required/);
  });

  await t.test("an ADMIN role token can access admin routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: fx.authAAdmin,
    });
    assert.equal(res.statusCode, 200);
  });

  await t.test("super-admin routes reject unauthenticated requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/super-admin/tenants",
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("super-admin routes reject non-super-admin tokens", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/super-admin/tenants",
      headers: { authorization: `Bearer ${fx.tokens.ownerA}` },
    });
    assert.equal(res.statusCode, 403);
    assert.match(res.json().message, /Super admin access required/);
  });

  await t.test("a USER token can access storefront routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/carts/",
      headers: fx.authAUser,
    });
    assert.equal(res.statusCode, 200);
  });
});
