import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

let client: PrismaClient | null = null;

export default function createPrisma(connectionString: string): PrismaClient {
  if (client) return client;
  const adapter = new PrismaNeon({ connectionString });
  client = new PrismaClient({ adapter });
  return client;
}
