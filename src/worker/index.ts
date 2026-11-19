import { Hono } from "hono";
import { cors } from "hono/cors";
import { closeApp, getApp } from "./lib/app-context";
import { authenticate, checkTenant } from "./middleware/check-tenant";
import { rateLimit } from "./middleware/rate-limit";
import { buildRouteEntries } from "./routes";
import { mountShimRoutes } from "./lib/dispatch";
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MESSAGES,
  buildUploadKey,
  buildUploadUrl,
  isMultipartRequest,
  validateUploadContentType,
} from "../helpers/upload";
import type { Env, WorkerEnv } from "./types";

const app = new Hono<WorkerEnv>();

app.onError((err, c) => {
  const status = (err as any)?.statusCode ?? (err as any)?.status ?? 500;
  const message = (err as any)?.message ?? "Internal Server Error";
  return c.json(
    {
      statusCode: status,
      error: status >= 500 ? "Internal Server Error" : "Bad Request",
      message,
      ...(err instanceof Error && (err as any).details
        ? { details: (err as any).details }
        : {}),
    },
    status as any,
  );
});

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use("*", async (c, next) => {
  try {
    return await next();
  } finally {
    await closeApp(c);
  }
});

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.get("/health/db", async (c) => {
  const prisma = getApp(c).prisma;
  const tenants = await prisma.tenant.count();
  return c.json({ ok: true, tenants });
});

app.use("*", checkTenant);

// Rate limiting runs after checkTenant so per-role budgets (e.g. the elevated
// /admin tier) can read the authenticated user. checkTenant passes public
// routes through to this middleware, so coverage is unchanged.
app.use("*", rateLimit());

app.post(
  "/upload",
  (c, next) => authenticate(c, next),
  async (c) => {
    const bucket = c.env.R2_BUCKET_NAME;
    if (!bucket) {
      return c.json(
        { status: "error", message: UPLOAD_MESSAGES.notConfigured },
        503,
      );
    }

    if (
      !isMultipartRequest(c.req.header("content-type"))
    ) {
      return c.json(
        { status: "error", message: UPLOAD_MESSAGES.notMultipart },
        400,
      );
    }

    const declared = Number(c.req.header("content-length") ?? 0);
    if (declared > UPLOAD_MAX_BYTES + 1024) {
      return c.json(
        { status: "error", message: UPLOAD_MESSAGES.tooLarge },
        413,
      );
    }

    let form: FormData;
    try {
      form = await c.req.raw.formData();
    } catch {
      return c.json(
        { status: "error", message: "Invalid multipart form data" },
        400,
      );
    }

    const fileFields = form.getAll("file");
    let fileCount = 0;
    form.forEach((value) => {
      if (value instanceof File) fileCount++;
    });
    if (
      fileFields.length !== 1 ||
      !(fileFields[0] instanceof File) ||
      fileCount !== 1
    ) {
      return c.json(
        {
          status: "error",
          message: UPLOAD_MESSAGES.singleFileRequired,
        },
        400,
      );
    }

    const file = fileFields[0];
    if (file.size > UPLOAD_MAX_BYTES) {
      return c.json(
        { status: "error", message: UPLOAD_MESSAGES.tooLarge },
        413,
      );
    }

    if (file.size === 0) {
      return c.json(
        { status: "error", message: UPLOAD_MESSAGES.emptyFile },
        400,
      );
    }

    const typeRejection = validateUploadContentType(file.type);
    if (typeRejection) {
      return c.json({ status: "error", message: typeRejection }, 415);
    }

    const key = buildUploadKey();
    const contentType = file.type || "application/octet-stream";
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType },
    });

    const url = buildUploadUrl(c.env.R2_PUBLIC_BASE_URL, key);

    return c.json(
      {
        status: "success",
        data: {
          key,
          url,
          contentType,
          size: file.size,
        },
      },
      201,
    );
  },
);

const routeDefinitions = buildRouteEntries({
  prisma: {},
  cache: null,
  jwt: {},
  bcrypt: {},
});

mountShimRoutes(app, routeDefinitions, (c) => buildRouteEntries(getApp(c)));

export default app as unknown as import("@cloudflare/workers-types").ExportedHandler<Env>;
