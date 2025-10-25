import { TenantService } from "../tenants/tenant-service";
import { UserService } from "../users/user-service";

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
    data: { user_id: string; hashedPassword: string; store_id: string },
  ) {
    return await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: data.user_id },
        data: { password: data.hashedPassword },
      }),
      this.prisma.passwordToken.update({
        where: { id: data.store_id },
        data: { used: true },
      }),
    ]);
  }

  async addRefreshToken(data: RefreshTokenInput) {
    return await this.prisma.refreshToken.create({ data });
  }

  async getRefreshToken(token: string) {
    return await this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async updateRefreshToken(refreshToken: string, newRefreshToken: string) {
    return await this.prisma.refreshToken.update({
      where: { token: refreshToken },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async deleteRefreshToken(token: string) {
    return await this.prisma.refreshToken.deleteMany({ where: { token } });
  }
}
