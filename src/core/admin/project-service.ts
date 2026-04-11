export class ProjectService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createProject(tenant_id: string, data: { name: string; description?: string; settings?: any }) {
    return await this.prisma.project.create({
      data: {
        tenant_id,
        name: data.name,
        description: data.description,
        settings: data.settings,
      },
    });
  }

  async getProjects(tenant_id: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenant_id };
    if (status) where.status = status;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectById(tenant_id: string, project_id: string) {
    return await this.prisma.project.findFirst({
      where: { id: project_id, tenant_id },
    });
  }

  async updateProject(tenant_id: string, project_id: string, data: { name?: string; description?: string; settings?: any; status?: string }) {
    return await this.prisma.project.updateMany({
      where: { id: project_id, tenant_id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.settings && { settings: data.settings }),
        ...(data.status && { status: data.status as any }),
      },
    }).then(() => this.getProjectById(tenant_id, project_id));
  }

  async archiveProject(tenant_id: string, project_id: string) {
    return await this.prisma.project.updateMany({
      where: { id: project_id, tenant_id },
      data: { status: "ARCHIVED" as any },
    });
  }

  async deleteProject(tenant_id: string, project_id: string) {
    return await this.prisma.project.updateMany({
      where: { id: project_id, tenant_id },
      data: { status: "DELETED" as any },
    });
  }

  async restoreProject(tenant_id: string, project_id: string) {
    return await this.prisma.project.updateMany({
      where: { id: project_id, tenant_id },
      data: { status: "ACTIVE" as any },
    });
  }
}
