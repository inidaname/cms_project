export class AuditLogService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createLog(data: {
    tenant_id: string;
    user_id?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return await this.prisma.auditLog.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        action: data.action as any,
        entityType: data.entityType as any,
        entityId: data.entityId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async getAuditLogs(
    tenant_id: string,
    options: {
      page?: number;
      limit?: number;
      user_id?: string;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { page = 1, limit = 20, user_id, action, entityType, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id };
    if (user_id) where.user_id = user_id;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEntityHistory(tenant_id: string, entityType: string, entityId: string) {
    return await this.prisma.auditLog.findMany({
      where: { tenant_id, entityType: entityType as any, entityId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserActivity(tenant_id: string, user_id: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenant_id, user_id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where: { tenant_id, user_id } }),
    ]);

    return {
      data: logs,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
