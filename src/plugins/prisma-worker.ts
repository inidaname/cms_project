import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

export default function createPrisma(connectionString: string): PrismaClient {
  const adapter = new PrismaNeon({
    connectionString,
  });

  return new PrismaClient({
    adapter: adapter as never,
  });
}
