import type { Context, Next } from "hono";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../../utils/enums";
import type { WorkerEnv } from "../types";
import { getApp } from "../lib/app-context";

// Public routes exempt from tenant resolution. Kept as exact path matches so
// an exemption can never silently extend to sibling or nested routes. Must
// mirror PUBLIC_ROUTES in src/plugins/check-tenant.ts (Node).
// Documented exemptions:
// - /health                    : liveness probe (no tenant context)
// - /webhook/finecore          : provider callback; authenticated by signature
//                                verification inside the handler
// - /tenants/onboard           : public tenant onboarding
// - /super-admin/login, /super-admin/refresh-token : platform login flows
// - /admin/team/invite/accept  : token-authenticated invite acceptance
const PUBLIC_ROUTES = new Set([
  "/health",
  "/webhook/finecore",
  "/tenants/onboard",
  "/super-admin/login",
  "/super-admin/refresh-token",
  "/admin/team/invite/accept",
]);

const ADMIN_ROUTES_PREFIX = "/admin";
const SUPER_ADMIN_ROUTES_PREFIX = "/super-admin";

export function authResponse(c: Context, status: number, message: string, code: string) {
  return c.json({ message, code, status: "error" }, status as any);
}

export async function checkTenant(c: Context<WorkerEnv>, next: Next) {
  const url = new URL(c.req.url).pathname;

  if (PUBLIC_ROUTES.has(url)) {
    return next();
  }

  const app = getApp(c);
  const jwt = app.jwt;

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

  // Bearer-token verification with tenant binding (applies to every protected
  // route, not only /admin): a token must belong to the tenant resolved from
  // the x-api-key header. Mirrors plugins/check-tenant.ts (Node).
  const authHeader = c.req.header("authorization");

  if (url.startsWith(ADMIN_ROUTES_PREFIX)) {
    if (!authHeader?.startsWith("Bearer ")) {
      return authResponse(c, StatusCode.ClientErrorUnauthorized, "Missing or invalid authorization header", CASErrorCode.UNAUTHORIZED_ACCESS);
    }
  }

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = await (jwt.verify as any)(authHeader.substring(7));

      if (decoded.tenant_id !== tenant.id) {
        return authResponse(c, StatusCode.ClientErrorForbidden, "Token does not belong to this tenant", CASErrorCode.FORBIDDEN);
      }

      if (url.startsWith(ADMIN_ROUTES_PREFIX) && !["OWNER", "ADMIN"].includes(decoded.role ?? "")) {
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
