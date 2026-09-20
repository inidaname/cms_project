import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

let client: PrismaClient | null = null;

type NeonHTTPFactory = new (connectionString: string) => InstanceType<typeof PrismaNeonHTTP>;

export default function createPrisma(connectionString: string): PrismaClient {
  if (client) return client;
  const Factory = PrismaNeonHTTP as unknown as NeonHTTPFactory;
  const adapter = new Factory(connectionString);
  client = new PrismaClient({ adapter: adapter as never });
  return client;
}
