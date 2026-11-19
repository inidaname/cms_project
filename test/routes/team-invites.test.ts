// Phase 2: team invitation lifecycle tests (prompt 5, priority 6).
// Covers invite creation, single-use acceptance, and expiry/replay guards.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

test("team invitations", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  let inviteToken = "";
  let inviteId = "";
  const invitedEmail = `iso1-invitee-${fx.suffix}@iso.test`;

  await t.test("an owner can invite a member", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/team/invite",
      headers: fx.authA,
      payload: { email: invitedEmail, role: "USER" },
    });
    assert.equal(res.statusCode, 201);

    // The raw token is delivered in the response (only its hash is stored).
    const invite = res.json().data;
    assert.ok(invite.token, "invite response must deliver the raw token");
    assert.ok(invite.inviteId);
    inviteToken = invite.token;
    inviteId = invite.inviteId;

    // The stored token must not be the raw token (hash at rest).
    const stored = await fx.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });
    assert.notEqual(stored?.token, inviteToken, "invite tokens must be hashed at rest");
    assert.equal(stored?.tenant_id, fx.tenantA.id);
  });

  await t.test("an invitation can be accepted exactly once", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/team/invite/accept",
      payload: {
        token: inviteToken,
        name: "Invited Member",
        password: "super-secret-123",
      },
    });
    assert.equal(res.statusCode, 200);

    const user = await fx.prisma.user.findFirst({
      where: { tenant_id: fx.tenantA.id, email: invitedEmail },
    });
    assert.ok(user, "accepted invite must create the user in the inviting tenant");
    assert.equal(user?.role, "USER");

    const replay = await app.inject({
      method: "POST",
      url: "/admin/team/invite/accept",
      payload: {
        token: inviteToken,
        name: "Invited Again",
        password: "super-secret-123",
      },
    });
    assert.equal(replay.statusCode, 400);
    assert.match(replay.json().message, /already used/);
  });

  await t.test("an expired invitation is rejected", async () => {
    const expired = await fx.prisma.teamInvite.create({
      data: {
        tenant_id: fx.tenantA.id,
        email: `iso1-expired-${fx.suffix}@iso.test`,
        role: "USER",
        token: `iso1-expired-token-${fx.suffix}`,
        invitedBy: fx.ownerA.id,
        expiresAt: new Date(Date.now() - 60 * 1000),
      },
    });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/admin/team/invite/accept",
        payload: {
          token: expired.token,
          name: "Too Late",
          password: "super-secret-123",
        },
      });
      assert.equal(res.statusCode, 400);
      assert.match(res.json().message, /expired/i);
    } finally {
      await fx.prisma.teamInvite
        .delete({ where: { id: expired.id } })
        .catch(() => {});
    }
  });

  await t.test("an unknown invitation token is rejected", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/admin/team/invite/accept",
      payload: {
        token: `iso1-unknown-${fx.suffix}`,
        name: "Nobody",
        password: "super-secret-123",
      },
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /Invalid invitation/);
  });

  await t.test("team listing only shows the caller's tenant members", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/team",
      headers: fx.authA,
    });
    assert.equal(res.statusCode, 200);
    const payload = res.json().data;
    const members = Array.isArray(payload) ? payload : payload?.data ?? [];
    const ids = members.map((m: any) => m.id);
    assert.ok(ids.includes(fx.ownerA.id));
    assert.ok(!ids.includes(fx.ownerB.id));
  });

  // Keep the invite record for cleanup via the fixture teardown.
  void inviteId;
});
