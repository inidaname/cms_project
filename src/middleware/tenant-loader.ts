import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../utils/enums";

const tenantLoader: FastifyPluginAsync = async (app) => {
  // Decorate the request object with null initially
  app.decorateRequest("tenant", null);

  app.addHook("onRequest", async (request, reply) => {
    // 1. Extract API Key from headers
    const apiKey = request.headers["x-api-key"] as string;

    // Optional: Exclude certain paths from requiring an API Key (like health checks)
    if (request.url === "/health") {
      return;
    }

    if (!apiKey) {
      return reply.status(StatusCode.ClientErrorUnauthorized).send({
        status: "error",
        message: "Missing API Key (x-api-key header)",
        code: CASErrorCode.UNAUTHORIZED_ACCESS,
      });
    }

    try {
      // 2. Query Prisma for the tenant
      const tenant = await app.prisma.tenant.findUnique({
        where: { apiKey: apiKey },
      });

      // 3. Validate Tenant existence and status
      if (!tenant) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          message: "Invalid API Key",
          code: CASErrorCode.USER_NOT_FOUND,
        });
      }

      if (tenant.status !== "ACTIVE") {
        return reply.status(StatusCode.ClientErrorForbidden).send({
          status: "error",
          message: `Tenant account is ${tenant.status.toLowerCase()}`,
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
        });
      }

      // 4. Attach the tenant object to the request
      request.tenant = tenant;
    } catch (error) {
      app.log.error(error);
      return reply.status(StatusCode.ServerErrorInternal).send({
        status: "error",
        message: CASErrorMessage.INTERNAL_SERVER_ERROR,
      });
    }
  });
};

export default fp(tenantLoader);
