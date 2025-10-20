import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

const prismaPlugin: PluginType = async (server, options) => {
  const prisma = new PrismaClient({ omit: { user: { password: true } } });
  await prisma.$connect();
  server.decorate("prisma", prisma);

  server.addHook("onClose", async (server) => {
    await server.prisma.$disconnect();
  });
};

export default fp(prismaPlugin);
