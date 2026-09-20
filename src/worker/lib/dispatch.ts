import type { Hono, Context } from "hono";
import StatusCode from "status-code-enum";
import type { WorkerEnv } from "../types";
import type { ShimRouteEntry } from "./fastify-shim";
import { validateSchemas, assertValid, type RouteSchemas } from "./ajv";
import { authenticate } from "../middleware/check-tenant";
import type { ContextUser } from "../types";

export function createRouteHandler(entry: ShimRouteEntry) {
  const validators = validateSchemas(entry.schema as RouteSchemas | undefined);

  return async (c: Context<WorkerEnv>) => {
    let rawBody: string | null = null;
    if (["POST", "PUT", "PATCH"].includes(c.req.method)) {
      try {
        rawBody = await c.req.raw.clone().text();
      } catch {
        rawBody = null;
      }
    }

    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key] = value;
    });
    let body: unknown = rawBody ? JSON.parse(rawBody) : null;
    const query = c.req.query();
    const param = c.req.param();

    for (const { target, validate } of validators) {
      if (target === "body") assertValid(validate, body, "body");
      else if (target === "query") assertValid(validate, query, "querystring");
      else if (target === "param") assertValid(validate, param, "params");
      else if (target === "header") assertValid(validate, headers, "headers");
    }

    const request = {
      body,
      params: param,
      query,
      querystring: query,
      headers,
      tenant: c.get("tenant"),
      user: c.get("user") as ContextUser | undefined,
      rawBody,
      ip: (headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() || "unknown",
      url: new URL(c.req.url).pathname,
      method: c.req.method,
    };

    let code = 200;
    let responseHeaders: Record<string, string> = {};
    let payload: unknown;
    const reply = {
      status(s: number) {
        code = s;
        return reply;
      },
      code(s: number) {
        code = s;
        return reply;
      },
      header(name: string, value: string) {
        responseHeaders = { ...responseHeaders, [name]: value };
        return reply;
      },
      send(p?: unknown) {
        payload = p;
        return reply;
      },
    };

    try {
      await entry.handler(request, reply as never);
    } catch (thrown) {
      const errObj = thrown as { statusCode?: number; message?: string; status?: string };
      const err = new Error(errObj?.message ?? "Internal Server Error");
      (err as unknown as Record<string, unknown>).statusCode =
        errObj?.statusCode ?? 500;
      (err as unknown as Record<string, unknown>).status = errObj?.status;
      throw err;
    }

    for (const [k, v] of Object.entries(responseHeaders)) {
      c.header(k, v);
    }
    return c.json(payload ?? null, code as any);
  };
}

export function mountShimRoutes(instance: Hono<WorkerEnv>, entries: ShimRouteEntry[]) {
  for (const entry of entries) {
    let routePath = `${entry.prefix}${entry.path}`.replace(/\/+$/, "") || "/";
    if (!routePath.startsWith("/")) routePath = `/${routePath}`;

    const handler = createRouteHandler(entry);

    if (entry.authenticate) {
      instance.on(entry.method, routePath, (c, next) => authenticate(c, next), (c) => handler(c));
    } else {
      instance.on(entry.method, routePath, (c) => handler(c));
    }
    void StatusCode;
  }
}
