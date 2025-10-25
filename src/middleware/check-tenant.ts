import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";

const tenantResolver: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest("tenant", null);

  fastify.addHook("preHandler", async (req, reply) => {
    const apiKey = req.headers["x-api-key"] as string | undefined;

    if (!apiKey) {
      return reply.status(401).send({ error: "Missing x-api-key header" });
    }

    const tenant = await fastify.prisma.tenant.findUnique({
      where: { apiKey },
    });

    if (!tenant) {
      return reply.status(403).send({ error: "Invalid API key" });
    }

    req.tenant = tenant;
  });
});

export default tenantResolver;
