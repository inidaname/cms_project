import { Prisma } from "../generated/prisma";
import { createPagination } from "../utils/pagination";

export class TenantService {
  prisma;
  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async getAllTenants(page = 1, limit = 10, filter?: string) {
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
      this.prisma.tenant.findMany({
        where: whereClause,
        include: { _count: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenant.count({ where: whereClause }),
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
    return await this.prisma.tenant.count({ where });
  }

  async getTenantById(id: string) {
    return await this.prisma.tenant.findUnique({ where: { id } });
  }

  async createTenant(data: TenantInput) {
    return await this.prisma.tenant.create({
      data,
      include: { TenantUser: true },
    });
  }

  async editTenant(id: string, data: TenantInput) {
    return await this.prisma.tenant.update({
      where: { id },
      data,
      include: { _count: true },
    });
  }

  async deleteTenant(id: string) {
    return await this.prisma.tenant.delete({ where: { id } });
  }
}
