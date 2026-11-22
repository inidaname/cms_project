# Phase 5 Report — Upload Parity and Media Safety (prompt 4)

Status: **implemented and validated 2026-11-19**.

## What changed

### Node `/upload` is now a real, working route

The old `src/routes/upload/routes.ts` was a Hono app scaffold that could
never register as a Fastify plugin (`@fastify/multipart` was a declared but
unregistered dependency). It is now a Fastify route at `POST /upload` (the
autoload folder supplies the `/upload` prefix) using `@fastify/multipart`
(registered in `src/app.ts`) and the S3-compatible R2 API via
`@aws-sdk/client-s3` (credentials: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`; public URLs from
`R2_PUBLIC_BASE_URL`). Auth matches the Worker: API key + tenant status +
tenant-bound bearer JWT (`app.authenticate` + Phase 1 tenant binding).

### Shared contract — `src/helpers/upload.ts`

Both runtimes now import the same contract: 10 MiB limit, content-type
allowlist, opaque key builder, URL builder, and identical error messages:
`R2 storage is not configured` (503), `R2 storage is currently unavailable`
(503), `A multipart file is required` (400), `A single file in the 'file'
field is required` (400), `File exceeds the 10 MiB limit` (413), `Uploaded
file is empty` (400), `File content type is not allowed` (415).

### Contract (identical on Node and Worker)

- Exactly one file in `file`; extra files or a missing file → 400.
- `multipart/form-data` required; otherwise 400.
- 10 MiB enforced at **both** boundaries: declared `content-length`
  (rejected before parsing) and streamed data (multipart per-file limit /
  buffered size).
- Empty files rejected (400).
- Content-type allowlist: `image/jpeg`, `image/png`, `image/webp`,
  `image/gif`, `image/avif`, `application/pdf` — rejected with 415
  **before any storage access**. `image/svg+xml` is intentionally excluded
  (scriptable content served inline from a public bucket).
- Opaque server-generated keys (`uploads/<uuid>`); the client filename is
  never used for storage decisions (path traversal is structurally
  impossible).
- Validation runs before the storage-configuration check, so every
  rejection is verifiable without credentials; only validated uploads can
  reach storage, and missing config yields the documented 503.
- Success shape: 201 `{ status, data: { key, url, contentType, size } }`.

### Worker alignment

`src/worker/index.ts` `/upload` now imports the same shared contract
(allowlist + empty-file check + shared messages + URL/key builders). Its
R2-missing case also uses the shared 503 message.

## Media metadata, deletion, signed URLs (documented decisions)

- No media-metadata table exists; nothing is stored per upload beyond the
  R2 object itself, so there is no metadata to tenant-tag yet. If media
  metadata is added later it must carry `tenant_id` (prompt 9's schema work
  is the natural place).
- No deletion route exists yet; objects are immutable under opaque keys.
  A `DELETE /upload/:key` with tenant-scoped key ownership should be added
  before any user-facing delete feature.
- Objects are served from the public CDN base URL. Signed/private URLs are
  not needed for storefront assets today; the allowlist excludes active
  content types (SVG) as the XSS mitigation.

## Tests — `test/routes/upload.test.ts` (12 behavior-named cases)

Authentication, non-multipart rejection, missing file, extra files,
metadata-boundary size rejection, empty file, disallowed type (415 before
storage), SVG rejection, allowed types reaching the storage boundary, PDF
allowlist, and path-traversal filename neutrality. Storage is forced into
the no-R2 state for acceptance cases so tests never write to real buckets;
a `201` with the real bucket was verified incidentally during development
(one placeholder PNG `uploads/<uuid>` object was written to the configured
R2 bucket — harmless orphan).

## Validation results

- `npm run build:ts`, `npm run typecheck:worker`, `npx tsc -p test/tsconfig.json` — pass
- Full suite: **93/93 pass, exit 0**
