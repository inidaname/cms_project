import fp from "fastify-plugin";
import StatusCode from "status-code-enum";
import { CASErrorCode } from "../utils/enums";

const PUBLIC_ROUTES = [
  "/docs",
  "/docs/json",
  "/health",
  "/ping",
  "/documentation",
  "/webhook",
  "/admin/team/invite/accept",
];

const ADMIN_ROUTES_PREFIX = "/admin";

const tenantResolver: PluginType = async (fastify) => {
  fastify.decorateRequest("tenant", null as any);

  fastify.addHook("preHandler", async (req, reply) => {
    const url = req.raw.url ?? "";

    if (PUBLIC_ROUTES.some((route) => url.startsWith(route))) {
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

    if (url.startsWith(ADMIN_ROUTES_PREFIX)) {
      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          message: "Missing or invalid authorization header",
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
          status: "error",
        });
      }

      try {
        const token = authHeader.substring(7);
        const decoded = fastify.jwt.verify(token) as any;

        if (decoded.tenant_id !== tenant.id) {
          return reply.status(StatusCode.ClientErrorForbidden).send({
            message: "Token does not belong to this tenant",
            code: CASErrorCode.FORBIDDEN,
            status: "error",
          });
        }

        if (!["OWNER", "ADMIN"].includes(decoded.role)) {
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
