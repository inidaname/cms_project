import { FastifyInstance } from "fastify";
import { TenantService } from "./tenant-service";

export function tenantHanlder(app: FastifyInstance) {
  const service = new TenantService(app.prisma);

  return {};
}
