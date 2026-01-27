import fp from "fastify-plugin";
import StatusCode from "status-code-enum";
import { CASErrorCode } from "../utils/enums";

const PUBLIC_ROUTES = [
  "/docs",
  "/docs/json",
  "/health",
  "/ping",
  "/documentation",
];

const tenantResolver: PluginType = async (fastify) => {
  fastify.decorateRequest("tenant", null);

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
    });

    if (!tenant) {
      return reply.status(StatusCode.ClientErrorForbidden).send({
        message: "Invalid API key",
        code: "",
        status: "error",
      });
    }

    req.tenant = tenant;
  });
};

export default fp(tenantResolver);
