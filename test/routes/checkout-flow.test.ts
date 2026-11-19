// Phase 2: product → cart → checkout → sale transition tests (prompt 5,
// priority 3). Exercises the happy path end to end plus the guards around
// cart ownership and double checkout.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

test("checkout transitions", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  let cartId = "";

  await t.test("a tenant product can be added to the user's cart", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/carts/items",
      headers: fx.authAUser,
      payload: { product_id: fx.productA.id, product_quantity: 2 },
    });
    assert.equal(res.statusCode, 201);
    const cart = res.json().data;
    cartId = cart.id;
    assert.ok(Array.isArray(cart.cartItems) ? cart.cartItems.length > 0 : true);
  });

  await t.test("checkout converts the cart into a sale", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cartId },
    });
    assert.equal(res.statusCode, 201);
    const sale = res.json().data;
    assert.equal(sale.cart_id, cartId);
    assert.equal(sale.tenant_id, fx.tenantA.id);
    assert.equal(sale.user_id, fx.userA.id);
  });

  await t.test("the same cart cannot be checked out twice", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cartId },
    });
    assert.equal(res.statusCode, 409);
    assert.match(res.json().message, /already been checked out/);
  });

  await t.test("another tenant's cart cannot be checked out", async () => {
    // Tenant B owner attempts to check out tenant A's cart id: the lookup is
    // tenant- and user-scoped, so the cart is simply not found.
    const res = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authB,
      payload: { cart_id: cartId },
    });
    assert.equal(res.statusCode, 404);
  });

  await t.test("a different user of the same tenant cannot check out the cart", async () => {
    // A fresh cart owned by userA: the owner token (a different user) cannot
    // check it out even with the same tenant API key.
    const cartRes = await app.inject({
      method: "POST",
      url: "/carts/items",
      headers: fx.authAUser,
      payload: { product_id: fx.productA.id, product_quantity: 1 },
    });
    const secondCart = cartRes.json().data;
    const res = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authA,
      payload: { cart_id: secondCart.id },
    });
    assert.equal(res.statusCode, 404);
  });

  await t.test("checkout lookup is scoped to the owning user and tenant", async () => {
    // Create and check out a cart as userA, then fetch the sale by its id.
    const cartRes = await app.inject({
      method: "POST",
      url: "/carts/items",
      headers: fx.authAUser,
      payload: { product_id: fx.productA.id, product_quantity: 1 },
    });
    const cart = cartRes.json().data;
    const checkoutRes = await app.inject({
      method: "POST",
      url: "/checkout/",
      headers: fx.authAUser,
      payload: { cart_id: cart.id },
    });
    const sale = checkoutRes.json().data;
    assert.ok(sale?.id, "checkout must return the sale");

    const ownRes = await app.inject({
      method: "GET",
      url: `/checkout/${sale.id}`,
      headers: fx.authAUser,
    });
    assert.equal(ownRes.statusCode, 200);
    assert.equal(ownRes.json().data?.id, sale.id);

    const otherRes = await app.inject({
      method: "GET",
      url: `/checkout/${sale.id}`,
      headers: fx.authA, // same tenant, different user
    });
    assert.equal(otherRes.statusCode, 200);
    assert.equal(otherRes.json().data, null);

    const foreignRes = await app.inject({
      method: "GET",
      url: `/checkout/${sale.id}`,
      headers: fx.authB,
    });
    assert.equal(foreignRes.statusCode, 200);
    assert.equal(foreignRes.json().data, null);
  });
});
