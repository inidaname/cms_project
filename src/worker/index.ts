import { Hono } from "hono";
import createPrisma from "../plugins/prisma-worker";

export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CACHE: KVNamespace;
  [key: string]: unknown;
};

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  const status = (err as any)?.statusCode ?? (err as any)?.status ?? 500;
  const message = (err as any)?.message ?? "Internal Server Error";
  return c.json({ statusCode: status, error: status >= 500 ? "Internal Server Error" : "Bad Request", message }, status as any);
});

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.get("/health/db", async (c) => {
  const prisma = createPrisma(c.env.DATABASE_URL);
  const tenants = await prisma.tenant.count();
  return c.json({ ok: true, tenants });
});

export default app as unknown as ExportedHandler<Env>;
