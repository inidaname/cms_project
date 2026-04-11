import crypto from "crypto";
import bcrypt from "bcrypt";

export class TeamService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async getTeamMembers(tenant_id: string, page = 1, limit = 10, role?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenant_id };
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          agreed: true,
          createdAt: true,
          _count: { select: { purchases: true, carts: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        ...u,
        totalPurchases: u._count.purchases,
        totalCarts: u._count.carts,
      })),
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMemberById(tenant_id: string, user_id: string) {
    return await this.prisma.user.findFirst({
      where: { id: user_id, tenant_id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        agreed: true,
        createdAt: true,
        updatedAt: true,
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { purchases: true, carts: true } },
      },
    });
  }

  async updateMemberRole(tenant_id: string, user_id: string, role: string) {
    return await this.prisma.user.updateMany({
      where: { id: user_id, tenant_id },
      data: { role: role as any },
    });
  }

  async removeMember(tenant_id: string, user_id: string) {
    return await this.prisma.user.deleteMany({
      where: { id: user_id, tenant_id },
    });
  }

  async inviteMember(tenant_id: string, invitedBy: string, email: string, role: string = "USER") {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const existingUser = await this.prisma.user.findFirst({
      where: { tenant_id, email },
    });

    if (existingUser) {
      throw new Error("User already exists in this tenant");
    }

    return await this.prisma.teamInvite.create({
      data: {
        tenant_id,
        invitedBy,
        email,
        role: role as any,
        token,
        expiresAt,
      },
    });
  }

  async acceptInvite(token: string, name: string, password: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invite) {
      throw new Error("Invalid invitation");
    }

    if (invite.accepted) {
      throw new Error("Invitation already used");
    }

    if (new Date() > invite.expiresAt) {
      throw new Error("Invitation expired");
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { tenant_id: invite.tenant_id, email: invite.email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          tenant_id: invite.tenant_id,
          email: invite.email,
          name,
          password: hashedPassword,
          role: invite.role,
        },
      });

      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { accepted: true },
      });
    });

    return { message: "Invitation accepted successfully" };
  }

  async getInvites(tenant_id: string) {
    return await this.prisma.teamInvite.findMany({
      where: { tenant_id, accepted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async cancelInvite(tenant_id: string, invite_id: string) {
    return await this.prisma.teamInvite.deleteMany({
      where: { id: invite_id, tenant_id },
    });
  }
}
