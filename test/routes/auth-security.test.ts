// Phase 3: authentication and credential-handling security tests (prompt 2).
// Covers response sanitization, refresh-token rotation/replay/legacy
// compatibility, logout ownership, single-use password resets, and JWT
// secret configuration fail-fast.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";
import { sha256Hex } from "../../src/helpers/webcrypto";

test("authentication security", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  const password = "super-secret-123";
  let accessToken = "";
  let refreshToken = "";

  await t.test("registration never exposes password hashes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      headers: { "x-api-key": fx.tenantA.apiKey },
      payload: {
        email: `iso1-sec-${fx.suffix}@iso.test`,
        password,
        name: "Security User",
      },
    });
    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
    assert.equal(body.data.user.password, undefined);
    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  await t.test("login never exposes password hashes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "x-api-key": fx.tenantA.apiKey },
      payload: { email: `iso1-sec-${fx.suffix}@iso.test`, password },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.user.password, undefined);
  });

  await t.test("wrong credentials are rejected without user enumeration", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "x-api-key": fx.tenantA.apiKey },
      payload: { email: `iso1-sec-${fx.suffix}@iso.test`, password: "wrong-password" },
    });
    assert.equal(res.statusCode, 401);

    const unknown = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "x-api-key": fx.tenantA.apiKey },
      payload: { email: `iso1-nobody-${fx.suffix}@iso.test`, password: "wrong-password" },
    });
    assert.equal(unknown.statusCode, 401);
  });

  await t.test("tenant user listing never exposes password hashes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/tenant/",
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 200);
    const rows = res.json().data?.data ?? [];
    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.equal(row.password, undefined);
    }
  });

  await t.test("refresh tokens rotate and replays are rejected", async () => {
    const oldRefreshToken = refreshToken;
    const refresh = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      headers: { "x-api-key": fx.tenantA.apiKey, authorization: `Bearer ${accessToken}` },
      payload: { refreshToken: oldRefreshToken },
    });
    assert.equal(refresh.statusCode, 200);
    const newTokens = refresh.json().data;
    assert.ok(newTokens.accessToken);
    assert.notEqual(newTokens.refreshToken, oldRefreshToken);
    accessToken = newTokens.accessToken;
    refreshToken = newTokens.refreshToken;

    // The rotated-away token must be dead (hash replaced in place).
    const replay = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      headers: { "x-api-key": fx.tenantA.apiKey, authorization: `Bearer ${accessToken}` },
      payload: { refreshToken: oldRefreshToken },
    });
    assert.equal(replay.statusCode, 401);
  });

  await t.test("refresh tokens are stored hashed at rest", async () => {
    const stored = await fx.prisma.refreshToken.findFirst({
      where: { user: { email: `iso1-sec-${fx.suffix}@iso.test` } },
    });
    assert.ok(stored);
    assert.notEqual(stored?.token, refreshToken, "raw refresh token must not be persisted");
  });

  await t.test("a legacy plaintext refresh token still refreshes and rotates to a hash", async () => {
    // Simulates a session created before tokens were hashed at rest.
    const legacy = app.jwt.sign(
      { id: fx.userA.id, userType: "refresh_token", jti: `${fx.suffix}-legacy` },
      { expiresIn: "7d" },
    );
    await fx.prisma.refreshToken.create({
      data: {
        token: legacy,
        userId: fx.userA.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      headers: { "x-api-key": fx.tenantA.apiKey, authorization: `Bearer ${accessToken}` },
      payload: { refreshToken: legacy },
    });
    assert.equal(res.statusCode, 200);

    const row = await fx.prisma.refreshToken.findUnique({ where: { token: legacy } });
    assert.equal(row, null, "legacy plaintext row must be rotated to a hash");
  });

  await t.test("a revoked refresh token is rejected", async () => {
    // Unique per-invocation claims avoid collisions between deterministic
    // same-second JWT signings (token is a unique column).
    const revoked = app.jwt.sign(
      { id: fx.userA.id, userType: "refresh_token", jti: `${fx.suffix}-revoked` },
      { expiresIn: "7d" },
    );
    await fx.prisma.refreshToken.create({
      data: {
        token: await sha256Hex(revoked),
        userId: fx.userA.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: true,
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      headers: { "x-api-key": fx.tenantA.apiKey, authorization: `Bearer ${accessToken}` },
      payload: { refreshToken: revoked },
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("logout only revokes the caller's own refresh token", async () => {
    const other = app.jwt.sign(
      { id: fx.ownerA.id, userType: "refresh_token", jti: `${fx.suffix}-logout-other` },
      { expiresIn: "7d" },
    );
    await fx.prisma.refreshToken.create({
      data: {
        token: await sha256Hex(other),
        userId: fx.ownerA.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
      },
    });

    // userA (authenticated) must not be able to revoke ownerA's token.
    const foreign = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { "x-api-key": fx.tenantA.apiKey, authorization: `Bearer ${accessToken}` },
      payload: { refreshToken: other },
    });
    assert.equal(foreign.statusCode, 403);
    const stillThere = await fx.prisma.refreshToken.findUnique({
      where: { token: await sha256Hex(other) },
    });
    assert.ok(stillThere, "foreign refresh token must survive a foreign logout");

    // Own token revocation works.
    const own = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { "x-api-key": fx.tenantA.apiKey, authorization: `Bearer ${accessToken}` },
      payload: { refreshToken },
    });
    assert.equal(own.statusCode, 200);

    const afterOwn = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      headers: { "x-api-key": fx.tenantA.apiKey, authorization: `Bearer ${accessToken}` },
      payload: { refreshToken },
    });
    assert.equal(afterOwn.statusCode, 401);
  });

  await t.test("password reset tokens are single-use and expiring", async () => {
    const rawToken = `iso1-reset-${fx.suffix}`;
    await fx.prisma.passwordToken.create({
      data: {
        tokenHash: await sha256Hex(rawToken),
        user_id: fx.userA.id,
        tenant_id: fx.tenantA.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      headers: { "x-api-key": fx.tenantA.apiKey },
      payload: { token: rawToken, password: "brand-new-password-1" },
    });
    assert.equal(res.statusCode, 200);

    const replay = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      headers: { "x-api-key": fx.tenantA.apiKey },
      payload: { token: rawToken, password: "another-password-2" },
    });
    assert.equal(replay.statusCode, 400);

    // Expired tokens are rejected (different user to respect the
    // (tenant_id, user_id) unique constraint).
    const expired = `iso1-expired-reset-${fx.suffix}`;
    await fx.prisma.passwordToken.create({
      data: {
        tokenHash: await sha256Hex(expired),
        user_id: fx.ownerA.id,
        tenant_id: fx.tenantA.id,
        expiresAt: new Date(Date.now() - 1000),
        used: false,
      },
    });
    const expiredRes = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      headers: { "x-api-key": fx.tenantA.apiKey },
      payload: { token: expired, password: "brand-new-password-1" },
    });
    assert.equal(expiredRes.statusCode, 400);
  });

  await t.test("a missing JWT_SECRET fails fast in production", async () => {
    // ts-node compiles tests to CJS; use require for dynamic plugin loading.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: jwtPlugin } = require("../../src/plugins/jwt-plugin");
    const Fastify = require("fastify");

    const savedSecret = process.env.JWT_SECRET;
    const savedEnv = process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";

    try {
      const probe = Fastify({ logger: false });
      probe.register(jwtPlugin);
      await assert.rejects(
        () => probe.ready(),
        /JWT_SECRET must be set/,
        "production startup must refuse an insecure fallback secret",
      );
      await probe.close();
    } finally {
      if (savedSecret !== undefined) process.env.JWT_SECRET = savedSecret;
      else delete process.env.JWT_SECRET;
      if (savedEnv !== undefined) process.env.NODE_ENV = savedEnv;
      else delete process.env.NODE_ENV;
    }
  });

  await t.test("the development fallback JWT secret still boots outside production", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: jwtPlugin } = require("../../src/plugins/jwt-plugin");
    const Fastify = require("fastify");

    const savedSecret = process.env.JWT_SECRET;
    const savedEnv = process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;

    try {
      const probe = Fastify({ logger: false });
      probe.register(jwtPlugin);
      await probe.ready();
      await probe.close();
    } finally {
      if (savedSecret !== undefined) process.env.JWT_SECRET = savedSecret;
      else delete process.env.JWT_SECRET;
      if (savedEnv !== undefined) process.env.NODE_ENV = savedEnv;
      else delete process.env.NODE_ENV;
    }
  });
});
