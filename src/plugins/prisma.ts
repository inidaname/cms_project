import { PrismaClient } from "@prisma/client";
import fp from "fastify-plugin";

const prismaPlugin: PluginType = async (server, options) => {
  const prisma = new PrismaClient();

  // Fail fast with a clear message when the database is unreachable instead
  // of blocking startup on a slow/hung driver connection.
  const connectWithTimeout = Promise.race([
    prisma.$connect(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Database connection timed out after 15s. Check that DATABASE_URL points to a reachable PostgreSQL server.",
            ),
          ),
        15_000,
      ),
    ),
  ]);

  try {
    await connectWithTimeout;
  } catch (error) {
    await prisma.$disconnect().catch(() => {});
    throw error;
  }

  server.decorate("prisma", prisma);

  server.addHook("onClose", async (server) => {
    await server.prisma.$disconnect();
  });
};

export default fp(prismaPlugin);
