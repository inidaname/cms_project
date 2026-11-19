// Shared upload contract used by both the Node Fastify route and the
// Cloudflare Worker /upload route so both runtimes accept and reject the
// exact same cases with the exact same messages.

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB

// Storefront asset allowlist. SVG is intentionally excluded: it can carry
// active content (script) and is served inline from the public bucket.
export const UPLOAD_ALLOWED_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
]);

export const UPLOAD_MESSAGES = {
  notConfigured: "R2 storage is not configured",
  storageUnavailable: "R2 storage is currently unavailable",
  notMultipart: "A multipart file is required",
  singleFileRequired: "A single file in the 'file' field is required",
  tooLarge: "File exceeds the 10 MiB limit",
  emptyFile: "Uploaded file is empty",
  disallowedType: "File content type is not allowed",
} as const;

export function isMultipartRequest(contentType: string | undefined): boolean {
  return !!contentType?.toLowerCase().startsWith("multipart/form-data");
}

/**
 * Validates a file's declared content type against the allowlist.
 * Returns null when allowed, or the reason string when rejected.
 */
export function validateUploadContentType(
  contentType: string | undefined | null,
): string | null {
  if (!contentType) return UPLOAD_MESSAGES.disallowedType;
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  if (!UPLOAD_ALLOWED_TYPES.has(normalized)) return UPLOAD_MESSAGES.disallowedType;
  return null;
}

/** Opaque storage key; the client filename is never used. */
export function buildUploadKey(): string {
  return `uploads/${crypto.randomUUID()}`;
}

export function buildUploadUrl(
  publicBaseUrl: string | undefined,
  key: string,
): string | null {
  const base = publicBaseUrl?.replace(/\/+$/, "");
  return base ? `${base}/${key}` : null;
}
