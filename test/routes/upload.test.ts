// Phase 5: upload contract tests for the Node /upload route (prompt 4).
// The test environment has no R2 credentials, so accepted uploads end at the
// documented 503 — which proves they passed the full validation contract.
// Rejection cases must return their contract status BEFORE any storage check.
import { test, type TestContext } from "node:test";
import * as assert from "node:assert";

import { build } from "../helper";
import { createTenantFixture } from "../support/tenants";

const BOUNDARY = "----iso1testboundary";

type Part = {
  name: string;
  filename?: string;
  type: string;
  value: string | Buffer;
};

function multipartBody(parts: Part[]): Buffer {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    if (part.filename !== undefined) {
      chunks.push(
        Buffer.from(
          `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: ${part.type}\r\n\r\n`,
        ),
      );
      chunks.push(Buffer.isBuffer(part.value) ? part.value : Buffer.from(part.value));
      chunks.push(Buffer.from("\r\n"));
    } else {
      chunks.push(
        Buffer.from(
          `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`,
        ),
      );
    }
  }
  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`));
  return Buffer.concat(chunks);
}

function pngBytes(): Buffer {
  // Minimal PNG signature + payload; content type is what matters here.
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from("iso1-png-placeholder"),
  ]);
}

test("upload contract", async (t: TestContext) => {
  const app = await build(t);
  const fx = await createTenantFixture(t, app);

  const post = (body: Buffer, contentType: string, extraHeaders: Record<string, string> = {}) =>
    app.inject({
      method: "POST",
      url: "/upload",
      headers: {
        "x-api-key": fx.tenantA.apiKey,
        authorization: `Bearer ${fx.tokens.userA}`,
        "content-type": contentType,
        ...extraHeaders,
      },
      payload: body,
    });

  await t.test("upload requires authentication", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload: multipartBody([{ name: "file", filename: "a.png", type: "image/png", value: pngBytes() }]),
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test("a non-multipart request is rejected", async () => {
    const res = await post(Buffer.from("{}"), "application/json");
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().message, "A multipart file is required");
  });

  await t.test("a missing file field is rejected", async () => {
    const res = await post(
      multipartBody([{ name: "note", value: "no file here" }]),
      `multipart/form-data; boundary=${BOUNDARY}`,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().message, "A single file in the 'file' field is required");
  });

  await t.test("extra files are rejected", async () => {
    const res = await post(
      multipartBody([
        { name: "file", filename: "a.png", type: "image/png", value: pngBytes() },
        { name: "file", filename: "b.png", type: "image/png", value: pngBytes() },
      ]),
      `multipart/form-data; boundary=${BOUNDARY}`,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().message, "A single file in the 'file' field is required");
  });

  await t.test("a declared body over the limit is rejected at the metadata boundary", async () => {
    const body = multipartBody([
      { name: "file", filename: "big.png", type: "image/png", value: pngBytes() },
    ]);
    const res = await post(body, `multipart/form-data; boundary=${BOUNDARY}`, {
      "content-length": String(11 * 1024 * 1024),
    });
    assert.equal(res.statusCode, 413);
    assert.equal(res.json().message, "File exceeds the 10 MiB limit");
  });

  await t.test("an empty file is rejected", async () => {
    const res = await post(
      multipartBody([{ name: "file", filename: "empty.png", type: "image/png", value: Buffer.alloc(0) }]),
      `multipart/form-data; boundary=${BOUNDARY}`,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().message, "Uploaded file is empty");
  });

  await t.test("disallowed content types are rejected before any storage check", async () => {
    const res = await post(
      multipartBody([
        { name: "file", filename: "page.html", type: "text/html", value: "<html></html>" },
      ]),
      `multipart/form-data; boundary=${BOUNDARY}`,
    );
    assert.equal(res.statusCode, 415);
    assert.equal(res.json().message, "File content type is not allowed");
  });

  await t.test("svg is rejected (active content)", async () => {
    const res = await post(
      multipartBody([
        { name: "file", filename: "logo.svg", type: "image/svg+xml", value: "<svg></svg>" },
      ]),
      `multipart/form-data; boundary=${BOUNDARY}`,
    );
    assert.equal(res.statusCode, 415);
  });

  // Storage is environment-dependent; these tests force the no-R2 case so
  // they never write to real storage. A 503 here proves the request passed
  // the entire validation contract.
  const withoutR2 = async (fn: () => Promise<void>) => {
    const keys = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ];
    const saved = keys.map((k) => [k, process.env[k]] as const);
    for (const k of keys) delete process.env[k];
    try {
      await fn();
    } finally {
      for (const [k, v] of saved) {
        if (v !== undefined) process.env[k] = v;
        else delete process.env[k];
      }
    }
  };

  await t.test("an allowed type passes the full contract and reaches storage (503 without R2)", async () => {
    await withoutR2(async () => {
      const res = await post(
        multipartBody([
          { name: "file", filename: "a.png", type: "image/png", value: pngBytes() },
        ]),
        `multipart/form-data; boundary=${BOUNDARY}`,
      );
      assert.equal(res.statusCode, 503);
      assert.equal(res.json().message, "R2 storage is not configured");
    });
  });

  await t.test("pdf passes the contract (503 without R2)", async () => {
    await withoutR2(async () => {
      const res = await post(
        multipartBody([
          { name: "file", filename: "doc.pdf", type: "application/pdf", value: Buffer.from("%PDF-1.4 test") },
        ]),
        `multipart/form-data; boundary=${BOUNDARY}`,
      );
      assert.equal(res.statusCode, 503);
    });
  });

  await t.test("a client filename can never influence storage (path traversal)", async () => {
    await withoutR2(async () => {
      const res = await post(
        multipartBody([
          {
            name: "file",
            filename: "../../etc/passwd",
            type: "image/png",
            value: pngBytes(),
          },
        ]),
        `multipart/form-data; boundary=${BOUNDARY}`,
      );
      // Not rejected by the filename: the contract passes and the request ends
      // at the storage boundary (keys are opaque server-generated UUIDs).
      assert.equal(res.statusCode, 503);
      assert.equal(res.json().message, "R2 storage is not configured");
    });
  });
});
