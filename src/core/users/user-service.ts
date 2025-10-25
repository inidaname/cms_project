import { Prisma } from "@prisma/client";
import { createPagination } from "../../utils/pagination";

export class UserService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createUser(data: UserInput) {
    return await this.prisma.user.create({ data });
  }

  async getAllUsers(page = 1, limit = 10, filter?: string, tenant_id?: string) {
    const whereClause: Prisma.UserWhereInput = filter
      ? {
        OR: [
          { email: { contains: filter, mode: "insensitive" } },
          { name: { contains: filter, mode: "insensitive" } },
          { phone: { contains: filter, mode: "insensitive" } },
        ],
        tenant_id,
      }
      : {};

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
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

  async getUserById(id: string) {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(data: Omit<UserInput, "agreed">, id: string) {
    return await this.prisma.user.update({ where: { id }, data });
  }

  async getUserByEmailOrPhone(filter: string, tenant_id: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: filter },
          { phone: filter },
        ],
        tenant_id,
      },
    });
  }

  async countTenantsUsers(tenant_id: string, filter?: string) {
    const where: Prisma.UserWhereInput = filter
      ? {
        OR: [
          { email: { contains: filter, mode: "insensitive" } },
          { name: { contains: filter, mode: "insensitive" } },
          { phone: { contains: filter, mode: "insensitive" } },
        ],
        tenant_id,
      }
      : {};
    return await this.prisma.user.count({ where });
  }

  async deleteUser(id: string) {
    return await this.prisma.user.delete({ where: { id } });
  }
}
