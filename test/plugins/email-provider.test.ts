// Phase 7: email provider tests (no network). Selection by configuration,
// explicit failure for missing configuration, and fake-provider testability.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import {
  ResendEmailProvider,
  NullEmailProvider,
  createPlatformEmailProvider,
  type EmailMessage,
} from "../../src/utils/email";

const message: EmailMessage = {
  from: "Test <test@example.test>",
  to: "someone@example.test",
  subject: "Hello",
  html: "<p>Hello</p>",
};

test("email providers", async (t: TestContext) => {
  await t.test("a missing RESEND_API_KEY selects the explicit Null provider", async () => {
    const provider = createPlatformEmailProvider({ RESEND_API_KEY: undefined });
    assert.ok(provider instanceof NullEmailProvider);

    const result = await provider.send(message);
    assert.equal(result.ok, false, "missing configuration never silently succeeds");
    if (!result.ok) {
      assert.match(result.error, /not configured/);
    }
  });

  await t.test("a present RESEND_API_KEY selects the Resend provider", async () => {
    const provider = createPlatformEmailProvider({ RESEND_API_KEY: "test-key" });
    assert.ok(provider instanceof ResendEmailProvider);
  });

  await t.test("the Resend provider maps provider results explicitly", async () => {
    const fakeClient = {
      emails: {
        send: async (input: { to: string[] }) => {
          if (input.to[0] === "fail@example.test") {
            return { data: null, error: { message: "Invalid recipient" } };
          }
          return { data: { id: "email-123" }, error: null };
        },
      },
    };
    const provider = new ResendEmailProvider(fakeClient as any);

    const ok = await provider.send(message);
    assert.deepEqual(ok, { ok: true, id: "email-123" });

    const failed = await provider.send({ ...message, to: "fail@example.test" });
    assert.deepEqual(failed, { ok: false, error: "Invalid recipient" });
  });

  await t.test("the Resend provider survives network failures explicitly", async () => {
    const fakeClient = {
      emails: {
        send: async () => {
          throw new Error("Network unreachable");
        },
      },
    };
    const provider = new ResendEmailProvider(fakeClient as any);
    const result = await provider.send(message);
    assert.deepEqual(result, { ok: false, error: "Network unreachable" });
  });

  await t.test("a fake provider can stand in for services (testability)", async () => {
    const sent: EmailMessage[] = [];
    const fake: import("../../src/utils/email").EmailProvider = {
      send: async (msg) => {
        sent.push(msg);
        return { ok: true, id: "fake-1" };
      },
    };

    const result = await fake.send(message);
    assert.equal(result.ok, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, message.to);
  });
});
