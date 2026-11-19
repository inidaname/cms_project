// Phase 7: Worker shim auth-hook detection. The shim must detect the real
// authenticate guard by function reference (not by Function.name) so JWT
// enforcement can never silently attach to a differently-named hook — or
// detach from the real one.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { createScope } from "../../src/worker/lib/fastify-shim";

function fakeAuthenticate(c: unknown, next: () => Promise<void>) {
  return next();
}

test("worker shim auth detection", async (t: TestContext) => {
  await t.test("the real authenticate guard is detected as a route-level preHandler", async () => {
    const scope = createScope({
      prisma: {},
      jwt: {},
      bcrypt: {},
      cache: null,
      authenticate: fakeAuthenticate,
    });

    scope.post("/guarded", { preHandler: [scope.authenticate] }, async () => ({}));
    const entries = scope.entries("");
    assert.equal(entries.length, 1);
    assert.equal(entries[0].authenticate, true);
  });

  await t.test("a differently-named hook is NOT treated as authentication", async () => {
    const scope = createScope({
      prisma: {},
      jwt: {},
      bcrypt: {},
      cache: null,
      authenticate: fakeAuthenticate,
    });

    // A hook that checks roles but is not the auth guard must not flip the
    // route into JWT-enforced mode in the Worker.
    const checkRole = function checkRole(c: unknown, next: () => Promise<void>) {
      return next();
    };
    scope.post("/role-only", { preHandler: [checkRole] }, async () => ({}));
    const entries = scope.entries("");
    assert.equal(entries[0].authenticate, false);
  });

  await t.test("an added onRequest hook matching the guard is detected", async () => {
    const scope = createScope({
      prisma: {},
      jwt: {},
      bcrypt: {},
      cache: null,
      authenticate: fakeAuthenticate,
    });

    scope.addHook("onRequest", scope.authenticate);
    scope.get("/hooked", async () => ({}));
    const entries = scope.entries("");
    assert.equal(entries[0].authenticate, true);
  });
});
