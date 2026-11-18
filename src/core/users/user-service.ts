import { Prisma } from "@prisma/client";
import { createPagination } from "../../utils/pagination";

export class UserService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createUser(data: UserInput) {
    return await this.prisma.user.create({ data, include: { tenant: true } });
  }

  async getAllUsers(page = 1, limit = 10, filter?: string, tenant_id?: string) {
    // tenant_id is always enforced; the filter is an additional condition.
    const whereClause: Prisma.UserWhereInput = {
      tenant_id,
      ...(filter
        ? {
            OR: [
              { email: { contains: filter, mode: "insensitive" } },
              { name: { contains: filter, mode: "insensitive" } },
              { phone: { contains: filter, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        include: { tenant: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getUserById(id: string, tenant_id: string) {
    return await this.prisma.user.findUnique({ where: { id, tenant_id } });
  }

  async getUserByIdOnly(id: string) {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(data: Omit<UserInput, "agreed">, id: string) {
    // Whitelist self-service fields: role, tenant_id, id and password are
    // never assignable through this update path.
    const allowed = ["email", "name", "phone", "agreed"] as const;
    const payload: Record<string, unknown> = {};
    for (const key of allowed) {
      if (data[key as keyof typeof data] !== undefined) {
        payload[key] = data[key as keyof typeof data];
      }
    }
    return await this.prisma.user.update({
      where: { id },
      data: payload as any,
    });
  }

  async getUserByEmailOrPhone(filter: string, tenant_id: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: filter }, { phone: filter }],
        tenant_id,
      },
    });
  }

  async countTenantsUsers(tenant_id: string, filter?: string) {
    // tenant_id is always enforced; the filter is an additional condition.
    const where: Prisma.UserWhereInput = {
      tenant_id,
      ...(filter
        ? {
            OR: [
              { email: { contains: filter, mode: "insensitive" } },
              { name: { contains: filter, mode: "insensitive" } },
              { phone: { contains: filter, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return await this.prisma.user.count({ where });
  }

  async deleteUser(id: string, tenant_id: string) {
    return await this.prisma.user.delete({ where: { id, tenant_id } });
  }
}
