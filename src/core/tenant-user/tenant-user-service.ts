import { Prisma } from "../../generated/prisma";
import { createPagination } from "../../utils/pagination";

export class TenantUserService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async addUserTenant(data: TenantUserInput) {
    return await this.prisma.tenantUser.create({
      data,
      include: { Tenant: true, User: true },
    });
  }

  async getConnectionById(id: string) {
    return await this.prisma.tenantUser.findUnique({
      where: { id },
      include: { Tenant: true, User: true },
    });
  }

  async deleteConnection(id: string) {
    return await this.prisma.tenantUser.delete({ where: { id } });
  }

  async updateRole(role: string, id: string) {
    return await this.prisma.tenantUser.update({
      where: { id },
      data: { role },
      include: { Tenant: true, User: true },
    });
  }

  async getTenantUsers(
    tenant_id: string,
    page = 1,
    limit = 10,
    filter?: string,
  ) {
    const where: Prisma.TenantUserWhereInput = filter
      ? {
        tenant_id,
        OR: [
          { role: { contains: filter, mode: "insensitive" } },
          {
            User: {
              OR: [
                { email: { contains: filter, mode: "insensitive" } },
                { name: { contains: filter, mode: "insensitive" } },
                { phone: { contains: filter, mode: "insensitive" } },
              ],
            },
          },
        ],
      }
      : { tenant_id };
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenantUser.findMany({
        where,
        include: { User: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenantUser.count({ where }),
    ]);

    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getByTenantIdAndUserId(tenant_id: string, user_id: string) {
    return await this.prisma.tenantUser.findFirst({
      where: { tenant_id, user_id },
      include: { Tenant: true, User: true },
    });
  }

  async getByTenantIdAndDetail(tenant_id: string, detail: string) {
    return await this.prisma.tenantUser.findFirst({
      where: {
        tenant_id,
        User: { OR: [{ email: detail }, { phone: detail }] },
      },
      include: { Tenant: true, User: true },
    });
  }
}
