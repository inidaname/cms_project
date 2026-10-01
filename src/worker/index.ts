import { Hono } from "hono";
import { cors } from "hono/cors";
import { initContext, lazyContext } from "./lib/detached-context";
import { authenticate, checkTenant } from "./middleware/check-tenant";
import { rateLimit } from "./middleware/rate-limit";
import { buildRouteEntries } from "./routes";
import { mountShimRoutes } from "./lib/dispatch";
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
      ...(err instanceof Error && (err as any).details ? { details: (err as any).details } : {}),
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
  initContext(c.env);
  return next();
});

app.use("*", rateLimit());

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.get("/health/db", async (c) => {
  initContext(c.env);
  const prisma = lazyContext.prisma;
  const tenants = await prisma.tenant.count();
  return c.json({ ok: true, tenants });
});

app.use("*", checkTenant);

app.post(
  "/upload",
  (c, next) => authenticate(c, next),
  async (c) => {
    const bucket = c.env.UPLOADS;
    if (!bucket) {
      return c.json(
        { status: "error", message: "R2 storage is not configured" },
        503,
      );
    }

    if (!c.req.header("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      return c.json({ status: "error", message: "A multipart file is required" }, 400);
    }

    let form: FormData;
    try {
      form = await c.req.raw.formData();
    } catch {
      return c.json({ status: "error", message: "Invalid multipart form data" }, 400);
    }

    const fileFields = form.getAll("file");
    let fileCount = 0;
    form.forEach((value) => {
      if (value instanceof File) fileCount++;
    });
    if (fileFields.length !== 1 || !(fileFields[0] instanceof File) || fileCount !== 1) {
      return c.json({ status: "error", message: "A single file in the 'file' field is required" }, 400);
    }

    const file = fileFields[0];
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ status: "error", message: "File exceeds the 10 MiB limit" }, 413);
    }

    const key = `uploads/${crypto.randomUUID()}`;
    const contentType = file.type || "application/octet-stream";
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType },
    });

    const publicBaseUrl = c.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    const url = publicBaseUrl ? `${publicBaseUrl}/${key}` : null;

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

mountShimRoutes(app, buildRouteEntries());

export default app as unknown as ExportedHandler<Env>;
