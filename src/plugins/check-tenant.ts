import fp from "fastify-plugin";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../utils/enums";

// Public routes exempt from tenant resolution. Kept as exact path matches so
// an exemption can never silently extend to sibling or nested routes.
// Documented exemptions:
// - /docs, /docs/json, /documentation  : API documentation (no tenant context)
// - /health, /ping                     : liveness probes (no tenant context)
// - /webhook/finecore                  : provider callback; authenticated by
//                                        signature verification inside the handler
// - /tenants/onboard                   : public tenant onboarding
// - /super-admin/login, /super-admin/refresh-token : platform login flows
// - /admin/team/invite/accept          : token-authenticated invite acceptance
const PUBLIC_ROUTES = new Set([
  "/docs",
  "/docs/json",
  "/health",
  "/ping",
  "/documentation",
  "/webhook/finecore",
  "/tenants/onboard",
  "/super-admin/login",
  "/super-admin/refresh-token",
  "/admin/team/invite/accept",
]);

const ADMIN_ROUTES_PREFIX = "/admin";
const SUPER_ADMIN_ROUTES_PREFIX = "/super-admin";

const tenantResolver: PluginType = async (fastify) => {
  fastify.decorateRequest("tenant", null as any);

  fastify.addHook("preHandler", async (req, reply) => {
    const url = req.raw.url ?? "";
    const pathname = url.split("?")[0].split("#")[0];

    if (PUBLIC_ROUTES.has(pathname)) {
      return;
    }

    if (url.startsWith(SUPER_ADMIN_ROUTES_PREFIX)) {
      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          message: CASErrorMessage.UNAUTHORIZED_ACCESS,
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
          status: "error",
        });
      }

      try {
        const decoded = fastify.jwt.verify(authHeader.substring(7)) as any;

        if (decoded.role !== "SUPER_ADMIN") {
          return reply.status(StatusCode.ClientErrorForbidden).send({
            message: "Super admin access required",
            code: CASErrorCode.FORBIDDEN,
            status: "error",
          });
        }

        req.user = decoded;
      } catch (error) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          message: "Invalid or expired token",
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
          status: "error",
        });
      }

      return;
    }

    const apiKey = req.headers["x-api-key"] as string | undefined;

    if (!apiKey) {
      return reply.status(StatusCode.ClientErrorUnauthorized).send({
        message: "Missing API Key (x-api-key header)",
        code: CASErrorCode.UNAUTHORIZED_ACCESS,
        status: "error",
      });
    }

    const tenant = await fastify.prisma.tenant.findUnique({
      where: { apiKey },
      include: {
        tenantFinecoreConfig: true,
        tenantEmailConfig: true,
      },
    });

    if (!tenant) {
      return reply.status(StatusCode.ClientErrorForbidden).send({
        message: "Invalid API key",
        code: "",
        status: "error",
      });
    }

    req.tenant = tenant;

    if (tenant.status === "SUSPENDED" || tenant.status === "DELETED" || tenant.status === "ABANDONED") {
      return reply.status(StatusCode.ClientErrorForbidden).send({
        message: `This store is currently ${tenant.status.toLowerCase()}. Contact the platform operator.`,
        code: CASErrorCode.FORBIDDEN,
        status: "error",
      });
    }

    // Bearer-token verification with tenant binding (applies to every
    // protected route, not only /admin): a token must belong to the tenant
    // resolved from the x-api-key header.
    const authHeader = req.headers["authorization"] as string | undefined;

    if (url.startsWith(ADMIN_ROUTES_PREFIX)) {
      if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          message: "Missing or invalid authorization header",
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
          status: "error",
        });
      }
    }

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = fastify.jwt.verify(authHeader.substring(7)) as any;

        if (decoded.tenant_id !== tenant.id) {
          return reply.status(StatusCode.ClientErrorForbidden).send({
            message: "Token does not belong to this tenant",
            code: CASErrorCode.FORBIDDEN,
            status: "error",
          });
        }

        if (url.startsWith(ADMIN_ROUTES_PREFIX) && !["OWNER", "ADMIN"].includes(decoded.role)) {
          return reply.status(StatusCode.ClientErrorForbidden).send({
            message: "Admin access required",
            code: CASErrorCode.FORBIDDEN,
            status: "error",
          });
        }

        req.user = decoded;
      } catch (error) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          message: "Invalid or expired token",
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
          status: "error",
        });
      }
    }
  });
};

export default fp(tenantResolver);
