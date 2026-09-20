import type { Context, Next } from "hono";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../../utils/enums";
import type { WorkerEnv } from "../types";
import { getApp, lazyContext } from "../lib/detached-context";

const PUBLIC_ROUTES = [
  "/docs",
  "/docs/json",
  "/health",
  "/ping",
  "/openapi.json",
  "/webhook",
  "/tenants/onboard",
  "/super-admin/login",
  "/super-admin/refresh-token",
  "/admin/team/invite/accept",
];

const ADMIN_ROUTES_PREFIX = "/admin";
const SUPER_ADMIN_ROUTES_PREFIX = "/super-admin";

export function authResponse(c: Context, status: number, message: string, code: string) {
  return c.json({ message, code, status: "error" }, status as any);
}

export async function checkTenant(c: Context<WorkerEnv>, next: Next) {
  const url = new URL(c.req.url).pathname;

  if (PUBLIC_ROUTES.some((route) => url.startsWith(route))) {
    return next();
  }

  const app = getApp(c);
  const jwt = lazyContext.jwt!;

  if (url.startsWith(SUPER_ADMIN_ROUTES_PREFIX)) {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return authResponse(c, StatusCode.ClientErrorUnauthorized, CASErrorMessage.UNAUTHORIZED_ACCESS, CASErrorCode.UNAUTHORIZED_ACCESS);
    }

    try {
      const decoded = await (jwt.verify as any)(authHeader.substring(7));

      if (decoded.role !== "SUPER_ADMIN") {
        return authResponse(c, StatusCode.ClientErrorForbidden, "Super admin access required", CASErrorCode.FORBIDDEN);
      }

      c.set("user", decoded);
    } catch {
      return authResponse(c, StatusCode.ClientErrorUnauthorized, "Invalid or expired token", CASErrorCode.UNAUTHORIZED_ACCESS);
    }

    return next();
  }

  const apiKey = c.req.header("x-api-key");

  if (!apiKey) {
    return authResponse(c, StatusCode.ClientErrorUnauthorized, "Missing API Key (x-api-key header)", CASErrorCode.UNAUTHORIZED_ACCESS);
  }

  const tenant = await app.prisma.tenant.findUnique({
    where: { apiKey },
    include: {
      tenantFinecoreConfig: true,
      tenantEmailConfig: true,
    },
  });

  if (!tenant) {
    return authResponse(c, StatusCode.ClientErrorForbidden, "Invalid API key", "");
  }

  c.set("tenant", tenant);

  if (tenant.status === "SUSPENDED" || tenant.status === "DELETED" || tenant.status === "ABANDONED") {
    return authResponse(
      c,
      StatusCode.ClientErrorForbidden,
      `This store is currently ${tenant.status.toLowerCase()}. Contact the platform operator.`,
      CASErrorCode.FORBIDDEN,
    );
  }

  if (url.startsWith(ADMIN_ROUTES_PREFIX)) {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return authResponse(c, StatusCode.ClientErrorUnauthorized, "Missing or invalid authorization header", CASErrorCode.UNAUTHORIZED_ACCESS);
    }

    try {
      const decoded = await (jwt.verify as any)(authHeader.substring(7));

      if (decoded.tenant_id !== tenant.id) {
        return authResponse(c, StatusCode.ClientErrorForbidden, "Token does not belong to this tenant", CASErrorCode.FORBIDDEN);
      }

      if (!["OWNER", "ADMIN"].includes(decoded.role ?? "")) {
        return authResponse(c, StatusCode.ClientErrorForbidden, "Admin access required", CASErrorCode.FORBIDDEN);
      }

      c.set("user", decoded);
    } catch {
      return authResponse(c, StatusCode.ClientErrorUnauthorized, "Invalid or expired token", CASErrorCode.UNAUTHORIZED_ACCESS);
    }
  }

  return next();
}

export function authenticate(c: Context<WorkerEnv>, next: Next) {
  // Route-level guard mirroring plugins/jwt-plugin.ts `app.authenticate`.
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return authResponse(c, StatusCode.ClientErrorUnauthorized, CASErrorMessage.UNAUTHORIZED_ACCESS, CASErrorCode.UNAUTHORIZED_ACCESS);
  }
  const jwt = getApp(c).jwt;
  return (async () => {
    try {
      const decoded = await (jwt.verify as any)(authHeader.substring(7));
      c.set("user", decoded);
      return next();
    } catch {
      return authResponse(c, StatusCode.ClientErrorUnauthorized, CASErrorMessage.UNAUTHORIZED_ACCESS, CASErrorCode.UNAUTHORIZED_ACCESS);
    }
  })();
}
