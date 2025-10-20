import { Prisma } from "../generated/prisma";
import { createPagination } from "../utils/pagination";

export class TenantService {
  tenant;
  prisma;
  constructor(prisma: PrismaClientType) {
    this.tenant = prisma.tenant;
    this.prisma = prisma;
  }

  async getAllTenants(filter?: string, page = 1, limit = 10) {
    const whereClause: Prisma.TenantWhereInput = filter
      ? {
        OR: [
          { domain: { contains: filter, mode: "insensitive" } },
          { name: { contains: filter, mode: "insensitive" } },
          { status: { contains: filter, mode: "insensitive" } },
        ],
      }
      : {};

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.tenant.findMany({
        where: whereClause,
        include: { _count: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.tenant.count({ where: whereClause }),
    ]);

    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async countTenants(filter?: string) {
    const where: Prisma.TenantWhereInput = filter
      ? {
        OR: [
          { domain: { contains: filter, mode: "insensitive" } },
          { name: { contains: filter, mode: "insensitive" } },
          { status: { contains: filter, mode: "insensitive" } },
        ],
      }
      : {};
    return await this.tenant.count({ where });
  }

  async getTenantById(id: string) {
    return await this.tenant.findUnique({ where: { id } });
  }

  async createTenant(data: TenantInput) {
    return await this.tenant.create({ data, include: { TenantUser: true } });
  }

  async editTenant(id: string, data: TenantInput) {
    return await this.tenant.update({
      where: { id },
      data,
      include: { _count: true },
    });
  }

  async deleteTenant(id: string) {
    return await this.tenant.delete({ where: { id } });
  }
}
