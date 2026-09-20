import { Hono } from "hono";
import createPrisma from "../plugins/prisma-worker";
import { checkTenant } from "./middleware/check-tenant";
import { rateLimit } from "./middleware/rate-limit";
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

app.use("*", rateLimit());

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.get("/health/db", async (c) => {
  const prisma = createPrisma(c.env.DATABASE_URL);
  const tenants = await prisma.tenant.count();
  return c.json({ ok: true, tenants });
});

app.use("*", checkTenant);

export default app as unknown as ExportedHandler<Env>;
