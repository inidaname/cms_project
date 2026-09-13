import bcrypt from "bcrypt";

interface SuperAdminStats {
  totalTenants: number;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeTenants: number;
  suspendedTenants: number;
}

interface ListParams {
  page: number;
  limit: number;
  filter?: string;
}

export class SuperAdminService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async rotateRefreshToken(oldToken: string, newToken: string) {
    return this.prisma.refreshToken.update({
      where: { token: oldToken },
      data: {
        token: newToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async deleteRefreshToken(token: string) {
    return this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  paginationMeta(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, role: "SUPER_ADMIN" } });
  }

  async verifyPassword(plain: string, hashed: string) {
    return bcrypt.compare(plain, hashed);
  }

  async getOverview(): Promise<SuperAdminStats> {
    const [totalTenants, activeTenants, suspendedTenants, totalUsers, totalProducts, totalOrders, revenue] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { status: "ACTIVE" } }),
        this.prisma.tenant.count({ where: { status: "SUSPENDED" } }),
        this.prisma.user.count(),
        this.prisma.product.count(),
        this.prisma.sales.count(),
        this.prisma.payments.aggregate({
          where: { status: "Success" },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: Number(revenue._sum.amount ?? 0),
    };
  }

  async listTenants({ page, limit, filter }: ListParams) {
    const where: any = filter
      ? {
          AND: [
            { domain: { not: "platform" } },
            {
              OR: [
                { name: { contains: filter, mode: "insensitive" as const } },
                { domain: { contains: filter, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : { domain: { not: "platform" } };

    const [tenants, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        include: {
          _count: { select: { users: true, products: true, sales: true, subscribers: true, campaigns: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data: tenants, metadata: this.paginationMeta(total, page, limit) };
  }

  async createTenant(data: { name: string; domain: string; apiKey: string }) {
    const tenant = await this.prisma.tenant.create({ data });
    return tenant;
  }

  async getTenantById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, products: true, sales: true, subscribers: true, campaigns: true } },
        tenantFinecoreConfig: true,
      },
    });
  }

  async updateTenantStatus(id: string, status: string) {
    return this.prisma.tenant.update({ where: { id }, data: { status: status as any } });
  }

  async deleteTenant(id: string) {
    return this.prisma.tenant.delete({ where: { id } });
  }

  async listTenantUsers(tenant_id: string, { page, limit }: ListParams, filter?: string) {
    const where: any = filter
      ? {
          tenant_id,
          OR: [
            { email: { contains: filter, mode: "insensitive" as const } },
            { name: { contains: filter, mode: "insensitive" as const } },
          ],
        }
      : { tenant_id };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: { id: true, tenant_id: true, email: true, name: true, phone: true, role: true, agreed: true, createdAt: true, updatedAt: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, metadata: this.paginationMeta(total, page, limit) };
  }

  async listTenantProducts(tenant_id: string, { page, limit }: ListParams, filter?: string) {
    const where: any = filter
      ? { tenant_id, title: { contains: filter, mode: "insensitive" as const } }
      : { tenant_id };
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data: products, metadata: this.paginationMeta(total, page, limit) };
  }

  async listTenantOrders(tenant_id: string, { page, limit }: ListParams) {
    const where = { tenant_id };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.sales.findMany({
        where,
        include: { cart: { include: { cartItems: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.sales.count({ where }),
    ]);
    return { data: orders, metadata: this.paginationMeta(total, page, limit) };
  }

  async listTenantPayments(tenant_id: string, { page, limit }: ListParams) {
    const where = { tenant_id };
    const [payments, total] = await this.prisma.$transaction([
      this.prisma.payments.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.payments.count({ where }),
    ]);
    return { data: payments, metadata: this.paginationMeta(total, page, limit) };
  }

  async listTenantAuditLogs(tenant_id: string, { page, limit }: ListParams, filter?: string) {
    const where: any = filter
      ? { tenant_id, OR: [{ action: { contains: filter, mode: "insensitive" as const } }, { entityType: { contains: filter, mode: "insensitive" as const } }] }
      : { tenant_id };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: logs, metadata: this.paginationMeta(total, page, limit) };
  }

  async getTenantOwner(tenant_id: string) {
    return this.prisma.user.findFirst({
      where: { tenant_id, role: "OWNER" },
      orderBy: { createdAt: "asc" },
    });
  }

  async listUsers({ page, limit, filter }: ListParams) {
    const where: any = { role: { not: "SUPER_ADMIN" } };
    if (filter) {
      where.OR = [
        { email: { contains: filter, mode: "insensitive" as const } },
        { name: { contains: filter, mode: "insensitive" as const } },
      ];
    }
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: { id: true, tenant_id: true, email: true, name: true, phone: true, role: true, agreed: true, createdAt: true, updatedAt: true, tenant: { select: { id: true, name: true, domain: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, metadata: this.paginationMeta(total, page, limit) };
  }

  async updateUserRole(id: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");
    if (user.role === "SUPER_ADMIN") throw new Error("Cannot change the role of a super admin");
    return this.prisma.user.update({ where: { id }, data: { role: role as any } });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");
    if (user.role === "SUPER_ADMIN") throw new Error("Cannot delete a super admin");
    return this.prisma.user.delete({ where: { id } });
  }

  async listAuditLogs({ page, limit, filter }: ListParams) {
    const where: any = filter
      ? {
          OR: [
            { action: { contains: filter, mode: "insensitive" as const } },
            { entityType: { contains: filter, mode: "insensitive" as const } },
            { details: { contains: filter } },
          ],
        }
      : {};
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const data = await Promise.all(
      logs.map(async (log) => {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: log.tenant_id },
          select: { name: true },
        });
        return { ...log, user: log.user, tenant };
      })
    );
    return { data, metadata: this.paginationMeta(total, page, limit) };
  }
}
