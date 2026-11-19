import { TenantService } from "../tenants/tenant-service";
import { UserService } from "../users/user-service";
import { sha256Hex } from "../../helpers/webcrypto";

export class AuthService {
  user: UserService;
  tenant: TenantService;
  prisma;

  constructor(prisma: PrismaClientType) {
    this.user = new UserService(prisma);
    this.tenant = new TenantService(prisma);
    this.prisma = prisma;
  }

  async initiateForgotPassword(data: PasswdTokenInput) {
    return this.prisma.passwordToken.create({ data });
  }

  async deleteForgetPassword(user_id: string) {
    return await this.prisma.passwordToken.deleteMany({ where: { user_id } });
  }

  async getForgetPasswordToken(token: string) {
    return await this.prisma.passwordToken.findFirst({
      where: { tokenHash: token },
      include: { user: true },
    });
  }

  async updatePassword(
    data: {
      user_id: string;
      hashedPassword: string;
      store_id: string;
      tenant_id?: string;
    },
  ) {
    // Tenant scope: constrain both writes by the token record's tenant_id
    // when available (the token row is tenant-owned).
    return await Promise.all([
      this.prisma.user.update({
        where: {
          id: data.user_id,
          ...(data.tenant_id && { tenant_id: data.tenant_id }),
        },
        data: { password: data.hashedPassword },
      }),
      this.prisma.passwordToken.update({
        where: { id: data.store_id },
        data: { used: true },
      }),
    ]);
  }

  async addRefreshToken(data: RefreshTokenInput) {
    // Store only a hash of the refresh token; the raw JWT never touches the
    // database.
    const { token, ...rest } = data;
    return await this.prisma.refreshToken.create({
      data: {
        ...rest,
        token: await sha256Hex(token),
      } as any,
    });
  }

  async getRefreshToken(token: string) {
    const tokenHash = await sha256Hex(token);
    // Legacy rows may still hold the raw token (pre-hash deployments);
    // fall back so in-flight sessions keep working, and they rotate to
    // hashed rows on next refresh.
    return (
      (await this.prisma.refreshToken.findUnique({ where: { token: tokenHash } })) ??
      (await this.prisma.refreshToken.findUnique({ where: { token } }))
    );
  }

  async updateRefreshToken(refreshToken: string, newRefreshToken: string) {
    const tokenHash = await sha256Hex(refreshToken);
    const newTokenHash = await sha256Hex(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      return await this.prisma.refreshToken.update({
        where: { token: tokenHash },
        data: { token: newTokenHash, expiresAt },
      });
    } catch (error) {
      if ((error as any)?.code === "P2025") {
        // Legacy row still stores the raw token; rotate it to the hash.
        return await this.prisma.refreshToken.update({
          where: { token: refreshToken },
          data: { token: newTokenHash, expiresAt },
        });
      }
      throw error;
    }
  }

  async deleteRefreshToken(token: string) {
    const tokenHash = await sha256Hex(token);
    return await this.prisma.refreshToken.deleteMany({
      where: { token: { in: [tokenHash, token] } },
    });
  }

  async hasSecurityContext(data: {
    user_id: string;
    ipAddress: string;
    userAgent: string;
  }) {
    return Boolean(
      await this.prisma.auditLog.findFirst({
        where: {
          user_id: data.user_id,
          entityType: "USER",
          action: { in: ["LOGIN", "LOGOUT"] },
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
        select: { id: true },
      }),
    );
  }

  async recordSecurityEvent(data: {
    tenant_id: string;
    user_id: string;
    action: "LOGIN" | "LOGOUT";
    ipAddress: string;
    userAgent: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        action: data.action,
        entityType: "USER",
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}
